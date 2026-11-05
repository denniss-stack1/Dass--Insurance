variable "aws_region" {
  type        = string
  description = "The target AWS region to deploy the serverless insurance system."
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Project name prefix to maintain unique resources."
  default     = "dass-insurance"
}

variable "environment" {
  type        = string
  description = "Deployment lifecycle stage (e.g. dev, staging, prod)."
  default     = "dev"
}
