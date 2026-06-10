output "api_endpoint" {
  description = "Latency-based API endpoint (Route53)"
  value       = "https://${var.domain_name}"
}

output "primary_db_endpoint" {
  description = "Primary RDS writer endpoint"
  value       = module.primary.db_endpoint
  sensitive   = true
}

output "eu_db_endpoint" {
  description = "EU RDS read replica endpoint"
  value       = module.eu.db_endpoint
  sensitive   = true
}

output "apac_db_endpoint" {
  description = "APAC RDS read replica endpoint"
  value       = module.apac.db_endpoint
  sensitive   = true
}

output "s3_buckets" {
  description = "S3 bucket names per region"
  value       = module.s3_replication.bucket_names
}
