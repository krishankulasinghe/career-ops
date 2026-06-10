output "db_endpoint" {
  value     = aws_db_instance.this.endpoint
  sensitive = true
}

output "redis_endpoint" {
  value     = aws_elasticache_replication_group.this.primary_endpoint_address
  sensitive = true
}

output "alb_dns_name" {
  value = aws_lb.this.dns_name
}

output "alb_zone_id" {
  value = aws_lb.this.zone_id
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "vpc_id" {
  value = module.vpc.vpc_id
}
