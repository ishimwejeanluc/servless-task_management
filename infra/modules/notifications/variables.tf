variable "system_email" {
	description = "The outbound email address used by SES"
	type        = string
}

variable "tags" {
	description = "Resource tags"
	type        = map(string)
	default     = {}
}
variable "notification_lambda_arn" {
  description = "The ARN of the Notification Handler Lambda to subscribe to the SNS topic"
  type        = string
}