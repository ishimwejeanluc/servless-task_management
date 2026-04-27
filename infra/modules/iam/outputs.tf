output "create_task_role_arn" {
  description = "The ARN of the IAM role for the CreateTask function"
  value       = aws_iam_role.create_task_role.arn
}

output "get_tasks_role_arn" {
  description = "The ARN of the IAM role for the GetTasks function"
  value       = aws_iam_role.get_tasks_role.arn
}

output "update_task_role_arn" {
  description = "The ARN of the IAM role for the UpdateTask function"
  value       = aws_iam_role.update_task_role.arn
}

output "assign_task_role_arn" {
  description = "The ARN of the IAM role for the AssignTask function"
  value       = aws_iam_role.assign_task_role.arn
}

output "pre_signup_role_arn" {
  description = "The ARN of the IAM role for the PreSignUp function"
  value       = aws_iam_role.pre_signup_role.arn
}

output "post_confirmation_role_arn" {
  description = "The ARN of the IAM role for the PostConfirmation function"
  value       = aws_iam_role.post_confirmation_role.arn
}

output "notification_handler_role_arn" {
  description = "The ARN of the IAM role for the NotificationHandler function"
  value       = aws_iam_role.notification_handler_role.arn
}

output "list_users_role_arn" {
  description = "The ARN of the IAM role for the ListUsers function"
  value       = aws_iam_role.list_users_role.arn
}
