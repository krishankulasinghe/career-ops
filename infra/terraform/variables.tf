variable "env" {
  description = "Deployment environment (staging, production)"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name prefix for all resources"
  type        = string
  default     = "career-ops"
}

variable "primary_region" {
  description = "Primary AWS region"
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Primary domain name (e.g., app.career-ops.io)"
  type        = string
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone ID for the domain"
  type        = string
}

variable "db_instance_type" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.medium"
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t4g.small"
}

variable "ecs_cpu" {
  description = "ECS task CPU units (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 1024
}

variable "ecs_memory" {
  description = "ECS task memory in MiB"
  type        = number
  default     = 2048
}

variable "min_capacity" {
  description = "ECS autoscaling minimum tasks"
  type        = number
  default     = 2
}

variable "max_capacity" {
  description = "ECS autoscaling maximum tasks"
  type        = number
  default     = 20
}

variable "ecr_image_uri" {
  description = "ECR image URI with tag (e.g., 123456789.dkr.ecr.us-east-1.amazonaws.com/career-ops:latest)"
  type        = string
}

variable "app_env_vars" {
  description = "Environment variables for the application container"
  type        = map(string)
  sensitive   = true
  default     = {}
}
