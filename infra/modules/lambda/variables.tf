variable "handler" {
  description = "Entry point for lambda (e.g. index.handler)"
  type        = string
  default     = "index.handler"
}
variable "runtime" {
  description = "Engine runtime"
  type        = string
  default     = "nodejs20.x"
}
variable "role_arn" {
  description = "IAM role ARN attached to the Lambda"
  type        = string
}
variable "filename" {
  description = "Path to the zipped source code"
  type        = string
}

variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
}

variable "tags" {
  description = "A mapping of tags to assign to the resource"
  type        = map(string)
  default     = {}
}

variable "environment_variables" {
  description = "Map of environment variables for the lambda"
  type        = map(string)
  default     = {}
}
variable "memory_size" {
  description = "Memory allocated to the lambda"
  type        = number
  default     = 128
}
variable "timeout" {
  description = "Timeout in seconds"
  type        = number
  default     = 5
}
