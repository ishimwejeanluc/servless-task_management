output "api_endpoint" {
  description = "The execution ARN and endpoint of the API Gateway"
  value       = module.api_gateway.execution_arn
}

output "api_invoke_url" {
  description = "The base invoke URL for the deployed API Gateway stage"
  value       = module.api_gateway.invoke_url
}

output "cognito_user_pool_id" {
  description = "The ID of the generated Cognito User Pool"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_client_id" {
  description = "The app client ID for the generated Cognito User Pool"
  value       = module.cognito.user_pool_client_id
}

output "dynamodb_table_name" {
  description = "The name of the main tasks DynamoDB table"
  value       = module.dynamodb.table_name
}
