output "sns_topic_arn" {
  value = aws_sns_topic.task_notifications.arn
}
output "ses_identity_arn" {
  value = aws_ses_email_identity.system.arn
}