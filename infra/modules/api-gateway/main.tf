resource "aws_api_gateway_rest_api" "api" {
  name        = "task-api"
  description = "Serverless Task Management REST API"
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

data "aws_region" "current" {}

resource "aws_lambda_permission" "apigw_create_task" {
  statement_id  = "AllowAPIGatewayInvokeCreateTask"
  action        = "lambda:InvokeFunction"
  function_name = var.create_task_lambda_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*/*"
}

resource "aws_lambda_permission" "apigw_get_tasks" {
  statement_id  = "AllowAPIGatewayInvokeGetTasks"
  action        = "lambda:InvokeFunction"
  function_name = var.get_tasks_lambda_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*/*"
}

resource "aws_lambda_permission" "apigw_update_task" {
  statement_id  = "AllowAPIGatewayInvokeUpdateTask"
  action        = "lambda:InvokeFunction"
  function_name = var.update_task_lambda_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*/*"
}

resource "aws_lambda_permission" "apigw_assign_task" {
  statement_id  = "AllowAPIGatewayInvokeAssignTask"
  action        = "lambda:InvokeFunction"
  function_name = var.assign_task_lambda_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*/*"
}

resource "aws_api_gateway_authorizer" "cognito" {
  name          = "cognito-authorizer"
  type          = "COGNITO_USER_POOLS"
  rest_api_id   = aws_api_gateway_rest_api.api.id
  provider_arns = [var.cognito_user_pool_arn]
}
resource "aws_api_gateway_deployment" "deployment" {
  depends_on = [
    aws_api_gateway_authorizer.cognito,
    aws_api_gateway_method.post_tasks,
    aws_api_gateway_method.get_tasks,
    aws_api_gateway_method.put_task,
    aws_api_gateway_method.tasks_options,
    aws_api_gateway_integration.post_tasks_lambda,
    aws_api_gateway_integration.get_tasks_lambda,
    aws_api_gateway_integration.put_task_lambda,
    aws_api_gateway_integration.tasks_options,
  ]
  rest_api_id = aws_api_gateway_rest_api.api.id
  triggers = {
    redeployment = sha1(jsonencode(aws_api_gateway_rest_api.api.body))
  }
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "main" {
  deployment_id        = aws_api_gateway_deployment.deployment.id
  rest_api_id          = aws_api_gateway_rest_api.api.id
  stage_name           = "main"
  xray_tracing_enabled = true
  tags                 = var.tags
}
