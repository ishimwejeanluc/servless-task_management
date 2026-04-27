variable "tags" { type = map(string) }
variable "user_pool_id" { type = string }
variable "app_client_id" { type = string }
variable "api_url" { type = string }
variable "aws_region" { type = string }
variable "repository_url" { 
    type = string 
    default = "" 
}

variable "access_token" {
  type        = string
  description = "GitHub Personal Access Token"
  sensitive   = true
}
