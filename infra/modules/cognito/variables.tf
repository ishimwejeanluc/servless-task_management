
variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}

variable "pre_signup_lambda_arn" {
  description = "The ARN of the lambda to validate domain registrations during sign-up."
  type        = string
  default     = ""
}

