variable "cognito_user_pool_arn" {
  description = "ARN of the Cognito User Pool for API Gateway authorizer"
  type        = string
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}

variable "create_task_lambda_arn" {
  description = "Function ARN for the Create Task Lambda"
  type        = string
}

variable "get_tasks_lambda_arn" {
  description = "Function ARN for the Get Tasks Lambda"
  type        = string
}

variable "update_task_lambda_arn" {
  description = "Function ARN for the Update Task Lambda"
  type        = string
}

variable "assign_task_lambda_arn" {
  description = "Function ARN for the Assign Task Lambda"
  type        = string
}

variable "list_users_lambda_arn" {
  description = "Function ARN for the List Users Lambda"
  type        = string
}

variable "allowed_origins" {
  type        = list(string)
  description = "List of allowed origins for CORS"
  
}
