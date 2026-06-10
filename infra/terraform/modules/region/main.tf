locals {
  name_prefix = "${var.app_name}-${var.env}-${var.region}"
  az_count    = 2
  azs         = slice(data.aws_availability_zones.available.names, 0, local.az_count)

  common_tags = {
    App    = var.app_name
    Env    = var.env
    Region = var.region
    ManagedBy = "terraform"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# ─── VPC ──────────────────────────────────────────────────────────────────────

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = local.name_prefix
  cidr = var.vpc_cidr

  azs             = local.azs
  private_subnets = [for i, az in local.azs : cidrsubnet(var.vpc_cidr, 8, i)]
  public_subnets  = [for i, az in local.azs : cidrsubnet(var.vpc_cidr, 8, i + 10)]

  enable_nat_gateway     = true
  single_nat_gateway     = var.env != "production"
  enable_dns_hostnames   = true
  enable_dns_support     = true

  tags = local.common_tags
}

# ─── RDS PostgreSQL ───────────────────────────────────────────────────────────

resource "aws_db_subnet_group" "this" {
  name       = "${local.name_prefix}-db"
  subnet_ids = module.vpc.private_subnets
  tags       = local.common_tags
}

resource "aws_security_group" "db" {
  name   = "${local.name_prefix}-db-sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  tags = local.common_tags
}

resource "aws_db_instance" "this" {
  identifier             = "${local.name_prefix}-pg"
  engine                 = "postgres"
  engine_version         = "16.3"
  instance_class         = var.db_instance_type
  allocated_storage      = 100
  max_allocated_storage  = 1000
  storage_encrypted      = true
  kms_key_id             = aws_kms_key.rds.arn

  db_name  = "career_ops"
  username = "career_ops"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.db.id]

  # Primary: writer. Non-primary: read replica
  replicate_source_db   = var.is_primary ? null : var.primary_db_endpoint
  multi_az              = var.is_primary && var.env == "production"

  backup_retention_period = var.is_primary ? 35 : 0
  deletion_protection     = var.env == "production"
  skip_final_snapshot     = var.env != "production"
  final_snapshot_identifier = var.env == "production" ? "${local.name_prefix}-final" : null

  performance_insights_enabled = true
  monitoring_interval          = 60

  tags = local.common_tags
}

# ─── KMS Keys ─────────────────────────────────────────────────────────────────

resource "aws_kms_key" "rds" {
  description             = "${local.name_prefix} RDS encryption key"
  deletion_window_in_days = 14
  enable_key_rotation     = true
  tags                    = local.common_tags
}

resource "aws_kms_key" "s3" {
  description             = "${local.name_prefix} S3 encryption key"
  deletion_window_in_days = 14
  enable_key_rotation     = true
  tags                    = local.common_tags
}

# ─── ElastiCache Redis ────────────────────────────────────────────────────────

resource "aws_elasticache_subnet_group" "this" {
  name       = "${local.name_prefix}-redis"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "redis" {
  name   = "${local.name_prefix}-redis-sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  tags = local.common_tags
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id = "${var.app_name}-${var.env}-${replace(var.region, "-", "")}"
  description          = "Career-Ops Redis — ${var.region}"

  node_type               = var.redis_node_type
  num_cache_clusters      = var.env == "production" ? 2 : 1
  automatic_failover_enabled = var.env == "production"

  subnet_group_name       = aws_elasticache_subnet_group.this.name
  security_group_ids      = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_token.result

  tags = local.common_tags
}

resource "random_password" "redis_token" {
  length  = 32
  special = false
}

# ─── ECS Fargate ─────────────────────────────────────────────────────────────

resource "aws_ecs_cluster" "this" {
  name = local.name_prefix

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = local.common_tags
}

resource "aws_security_group" "ecs" {
  name   = "${local.name_prefix}-ecs-sg"
  vpc_id = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  tags = local.common_tags
}

resource "aws_iam_role" "ecs_task_execution" {
  name = "${local.name_prefix}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
  ]

  tags = local.common_tags
}

resource "aws_iam_role" "ecs_task" {
  name = "${local.name_prefix}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.name_prefix}"
  retention_in_days = 90
  tags              = local.common_tags
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${local.name_prefix}-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.ecs_cpu
  memory                   = var.ecs_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = var.ecr_image_uri
      essential = true

      portMappings = [{
        containerPort = 3000
        protocol      = "tcp"
      }]

      environment = [
        for k, v in var.app_env_vars : { name = k, value = v }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "app"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = local.common_tags
}

resource "aws_ecs_service" "app" {
  name            = "${local.name_prefix}-app"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.app.arn
  launch_type     = "FARGATE"
  desired_count   = var.min_capacity

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  tags = local.common_tags

  depends_on = [aws_lb_listener.https]
}

# ─── Auto Scaling ─────────────────────────────────────────────────────────────

resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "${local.name_prefix}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# ─── ALB ─────────────────────────────────────────────────────────────────────

resource "aws_security_group" "alb" {
  name   = "${local.name_prefix}-alb-sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

resource "aws_lb" "this" {
  name               = substr("${var.app_name}-${var.env}-${replace(var.region, "-", "")}", 0, 32)
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = var.env == "production"

  tags = local.common_tags
}

resource "aws_lb_target_group" "app" {
  name        = substr("${var.app_name}-${var.env}-${replace(var.region, "-", "")}", 0, 32)
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = local.common_tags
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.this.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# ─── ACM TLS Certificate ──────────────────────────────────────────────────────

data "aws_route53_zone" "this" {
  zone_id = var.hosted_zone_id
}

variable "hosted_zone_id" {
  type    = string
  default = ""
}

resource "aws_acm_certificate" "this" {
  domain_name       = "*.${data.aws_route53_zone.this.name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.common_tags
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.this.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id = var.hosted_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "this" {
  certificate_arn         = aws_acm_certificate.this.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
