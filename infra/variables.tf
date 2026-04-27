variable "aws_region" {
  description = "The AWS region to deploy resources to."
  type        = string
  default     = "eu-west-1"
}


variable "system_email" {
  description = "The sender email address for SES notifications."
  type        = string
  default     = "jeanluc.ishimwe@amalitech.com"
}

variable "tags" {
  description = "A mapping of tags to assign to all resources."
  type        = map(string)
  default = {
    Project   = "ServerlessTaskManagement"
    ManagedBy = "Terraform"
  }
}

variable "repository_url" {
  description = "The URL of your GitHub repository"
  type        = string
}

variable "github_token" {
  description = "GitHub Personal Access Token"
  type        = string
  sensitive   = true
}
