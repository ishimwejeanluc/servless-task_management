variable "dynamodb_table_arn" {
  description = "The ARN of the DynamoDB tasks table to grant Lambda access."
  type        = string
}

variable "sns_topic_arn" {
  description = "The ARN of the SNS topic to grant Lambda access."
  type        = string
}