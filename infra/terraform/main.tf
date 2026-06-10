terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "career-ops-terraform-state"
    key            = "career-ops/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "career-ops-terraform-locks"
    encrypt        = true
  }
}

# Primary region provider
provider "aws" {
  region = var.primary_region
  alias  = "primary"
}

# EU region provider
provider "aws" {
  region = "eu-west-1"
  alias  = "eu"
}

# APAC region provider
provider "aws" {
  region = "ap-southeast-1"
  alias  = "apac"
}

# ─── Modules ──────────────────────────────────────────────────────────────────

module "primary" {
  source = "./modules/region"
  providers = {
    aws = aws.primary
  }

  region           = var.primary_region
  env              = var.env
  app_name         = var.app_name
  vpc_cidr         = "10.0.0.0/16"
  db_instance_type = var.db_instance_type
  db_password      = var.db_password
  redis_node_type  = var.redis_node_type
  ecs_cpu          = var.ecs_cpu
  ecs_memory       = var.ecs_memory
  min_capacity     = var.min_capacity
  max_capacity     = var.max_capacity
  ecr_image_uri    = var.ecr_image_uri
  app_env_vars     = var.app_env_vars
  is_primary       = true
  primary_db_endpoint = ""
}

module "eu" {
  source = "./modules/region"
  providers = {
    aws = aws.eu
  }

  region           = "eu-west-1"
  env              = var.env
  app_name         = var.app_name
  vpc_cidr         = "10.1.0.0/16"
  db_instance_type = var.db_instance_type
  db_password      = var.db_password
  redis_node_type  = var.redis_node_type
  ecs_cpu          = var.ecs_cpu
  ecs_memory       = var.ecs_memory
  min_capacity     = var.min_capacity
  max_capacity     = var.max_capacity
  ecr_image_uri    = var.ecr_image_uri
  app_env_vars     = var.app_env_vars
  is_primary       = false
  primary_db_endpoint = module.primary.db_endpoint
}

module "apac" {
  source = "./modules/region"
  providers = {
    aws = aws.apac
  }

  region           = "ap-southeast-1"
  env              = var.env
  app_name         = var.app_name
  vpc_cidr         = "10.2.0.0/16"
  db_instance_type = var.db_instance_type
  db_password      = var.db_password
  redis_node_type  = var.redis_node_type
  ecs_cpu          = var.ecs_cpu
  ecs_memory       = var.ecs_memory
  min_capacity     = var.min_capacity
  max_capacity     = var.max_capacity
  ecr_image_uri    = var.ecr_image_uri
  app_env_vars     = var.app_env_vars
  is_primary       = false
  primary_db_endpoint = module.primary.db_endpoint
}

# ─── Route53 Latency-Based Routing ────────────────────────────────────────────

module "dns" {
  source = "./modules/dns"

  domain_name     = var.domain_name
  hosted_zone_id  = var.hosted_zone_id

  primary_alb_dns = module.primary.alb_dns_name
  eu_alb_dns      = module.eu.alb_dns_name
  apac_alb_dns    = module.apac.alb_dns_name

  primary_alb_zone_id = module.primary.alb_zone_id
  eu_alb_zone_id      = module.eu.alb_zone_id
  apac_alb_zone_id    = module.apac.alb_zone_id
}

# ─── S3 Cross-Region Replication ─────────────────────────────────────────────

module "s3_replication" {
  source = "./modules/s3-replication"
  providers = {
    aws.primary = aws.primary
    aws.eu      = aws.eu
    aws.apac    = aws.apac
  }

  app_name        = var.app_name
  env             = var.env
  primary_region  = var.primary_region
}
