resource "aws_ses_email_identity" "system" {
  email = var.system_email
}
resource "aws_sns_topic" "task_notifications" {
  name = "task-notifications"
  kms_master_key_id = "alias/aws/sns"
  tags = var.tags
}

resource "aws_sns_topic_subscription" "notification_lambda" {
  topic_arn = aws_sns_topic.task_notifications.arn
  protocol  = "lambda"
  endpoint  = var.notification_lambda_arn
}

resource "aws_lambda_permission" "sns_invoke_lambda" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = var.notification_lambda_arn
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.task_notifications.arn
}
