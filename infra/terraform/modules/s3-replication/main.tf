variable "app_name" { type = string }
variable "env" { type = string }
variable "primary_region" { type = string }

terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.primary, aws.eu, aws.apac]
    }
  }
}

# ─── Primary Bucket (us-east-1) ───────────────────────────────────────────────

resource "aws_s3_bucket" "primary" {
  provider = aws.primary
  bucket   = "${var.app_name}-${var.env}-assets-use1"

  tags = {
    App = var.app_name
    Env = var.env
    Region = "us-east-1"
  }
}

resource "aws_s3_bucket_versioning" "primary" {
  provider = aws.primary
  bucket   = aws_s3_bucket.primary.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "primary" {
  provider = aws.primary
  bucket   = aws_s3_bucket.primary.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "primary" {
  provider                = aws.primary
  bucket                  = aws_s3_bucket.primary.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─── EU Replica Bucket (eu-west-1) ───────────────────────────────────────────

resource "aws_s3_bucket" "eu" {
  provider = aws.eu
  bucket   = "${var.app_name}-${var.env}-assets-euw1"

  tags = {
    App = var.app_name
    Env = var.env
    Region = "eu-west-1"
  }
}

resource "aws_s3_bucket_versioning" "eu" {
  provider = aws.eu
  bucket   = aws_s3_bucket.eu.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "eu" {
  provider = aws.eu
  bucket   = aws_s3_bucket.eu.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "eu" {
  provider                = aws.eu
  bucket                  = aws_s3_bucket.eu.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─── APAC Replica Bucket (ap-southeast-1) ────────────────────────────────────

resource "aws_s3_bucket" "apac" {
  provider = aws.apac
  bucket   = "${var.app_name}-${var.env}-assets-apse1"

  tags = {
    App = var.app_name
    Env = var.env
    Region = "ap-southeast-1"
  }
}

resource "aws_s3_bucket_versioning" "apac" {
  provider = aws.apac
  bucket   = aws_s3_bucket.apac.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "apac" {
  provider = aws.apac
  bucket   = aws_s3_bucket.apac.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "apac" {
  provider                = aws.apac
  bucket                  = aws_s3_bucket.apac.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─── Replication Role ─────────────────────────────────────────────────────────

resource "aws_iam_role" "replication" {
  provider = aws.primary
  name     = "${var.app_name}-${var.env}-s3-replication"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "s3.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_policy" "replication" {
  provider = aws.primary
  name     = "${var.app_name}-${var.env}-s3-replication"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetReplicationConfiguration", "s3:ListBucket"]
        Resource = [aws_s3_bucket.primary.arn]
      },
      {
        Effect = "Allow"
        Action = ["s3:GetObjectVersionForReplication", "s3:GetObjectVersionAcl", "s3:GetObjectVersionTagging"]
        Resource = ["${aws_s3_bucket.primary.arn}/*"]
      },
      {
        Effect = "Allow"
        Action = ["s3:ReplicateObject", "s3:ReplicateDelete", "s3:ReplicateTags"]
        Resource = [
          "${aws_s3_bucket.eu.arn}/*",
          "${aws_s3_bucket.apac.arn}/*",
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "replication" {
  provider   = aws.primary
  role       = aws_iam_role.replication.name
  policy_arn = aws_iam_policy.replication.arn
}

# ─── Replication Configuration ────────────────────────────────────────────────

resource "aws_s3_bucket_replication_configuration" "primary" {
  provider = aws.primary
  bucket   = aws_s3_bucket.primary.id
  role     = aws_iam_role.replication.arn

  rule {
    id     = "replicate-to-eu"
    status = "Enabled"
    destination {
      bucket        = aws_s3_bucket.eu.arn
      storage_class = "STANDARD"
    }
  }

  rule {
    id     = "replicate-to-apac"
    status = "Enabled"
    destination {
      bucket        = aws_s3_bucket.apac.arn
      storage_class = "STANDARD"
    }
  }

  depends_on = [
    aws_s3_bucket_versioning.primary,
    aws_s3_bucket_versioning.eu,
    aws_s3_bucket_versioning.apac,
  ]
}

output "bucket_names" {
  value = {
    "us-east-1"       = aws_s3_bucket.primary.id
    "eu-west-1"       = aws_s3_bucket.eu.id
    "ap-southeast-1"  = aws_s3_bucket.apac.id
  }
}
