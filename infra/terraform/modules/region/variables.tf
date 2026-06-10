variable "region" {
  type = string
}

variable "env" {
  type = string
}

variable "app_name" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "db_instance_type" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "redis_node_type" {
  type = string
}

variable "ecs_cpu" {
  type = number
}

variable "ecs_memory" {
  type = number
}

variable "min_capacity" {
  type = number
}

variable "max_capacity" {
  type = number
}

variable "ecr_image_uri" {
  type = string
}

variable "app_env_vars" {
  type      = map(string)
  sensitive = true
  default   = {}
}

variable "is_primary" {
  type    = bool
  default = false
}

variable "primary_db_endpoint" {
  type    = string
  default = ""
}
