output "amplify_app_id" {
  value = aws_amplify_app.zenith_task.id
}

output "frontend_url" {
  value = "https://main.${aws_amplify_app.zenith_task.default_domain}"
}
