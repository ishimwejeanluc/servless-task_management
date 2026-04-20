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
