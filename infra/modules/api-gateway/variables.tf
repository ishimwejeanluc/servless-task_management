
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
  default     = ""
}

variable "get_tasks_lambda_arn" {
  description = "Function ARN for the Get Tasks Lambda"
  type        = string
  default     = ""
}

variable "update_task_lambda_arn" {
  description = "Function ARN for the Update Task Lambda"
  type        = string
  default     = ""
}

variable "assign_task_lambda_arn" {
  description = "Function ARN for the Assign Task Lambda"
  type        = string
  default     = ""
}

