variable "domain_name" { type = string }
variable "hosted_zone_id" { type = string }
variable "primary_alb_dns" { type = string }
variable "eu_alb_dns" { type = string }
variable "apac_alb_dns" { type = string }
variable "primary_alb_zone_id" { type = string }
variable "eu_alb_zone_id" { type = string }
variable "apac_alb_zone_id" { type = string }

# Latency-based routing: Route53 returns the ALB closest to the requester.
# Each record set has the same Name + Type but different SetIdentifier + Region.

resource "aws_route53_record" "primary" {
  zone_id        = var.hosted_zone_id
  name           = var.domain_name
  type           = "A"
  set_identifier = "us-east-1"

  latency_routing_policy {
    region = "us-east-1"
  }

  alias {
    name                   = var.primary_alb_dns
    zone_id                = var.primary_alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "eu" {
  zone_id        = var.hosted_zone_id
  name           = var.domain_name
  type           = "A"
  set_identifier = "eu-west-1"

  latency_routing_policy {
    region = "eu-west-1"
  }

  alias {
    name                   = var.eu_alb_dns
    zone_id                = var.eu_alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "apac" {
  zone_id        = var.hosted_zone_id
  name           = var.domain_name
  type           = "A"
  set_identifier = "ap-southeast-1"

  latency_routing_policy {
    region = "ap-southeast-1"
  }

  alias {
    name                   = var.apac_alb_dns
    zone_id                = var.apac_alb_zone_id
    evaluate_target_health = true
  }
}

output "api_endpoint" {
  value = "https://${var.domain_name}"
}
