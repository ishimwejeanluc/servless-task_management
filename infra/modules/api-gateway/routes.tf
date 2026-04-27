# ---------------------------------------------------------------------------------------------------------------------
# API RESOURCES
# ---------------------------------------------------------------------------------------------------------------------

resource "aws_api_gateway_resource" "tasks" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "tasks"
}

resource "aws_api_gateway_resource" "task_by_id" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.tasks.id
  path_part   = "{id}"
}

resource "aws_api_gateway_resource" "users" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "users"
}

resource "aws_api_gateway_resource" "assign" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.task_by_id.id
  path_part   = "assign"
}

# ---------------------------------------------------------------------------------------------------------------------
# POST /tasks
# ---------------------------------------------------------------------------------------------------------------------

resource "aws_api_gateway_method" "post_tasks" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.tasks.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "post_tasks_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.tasks.id
  http_method             = aws_api_gateway_method.post_tasks.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.create_task_lambda_arn}/invocations"
}

# ---------------------------------------------------------------------------------------------------------------------
# GET /tasks
# ---------------------------------------------------------------------------------------------------------------------

resource "aws_api_gateway_method" "get_tasks" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.tasks.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "get_tasks_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.tasks.id
  http_method             = aws_api_gateway_method.get_tasks.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.get_tasks_lambda_arn}/invocations"
}

# ---------------------------------------------------------------------------------------------------------------------
# PUT /tasks/{id}
# ---------------------------------------------------------------------------------------------------------------------

resource "aws_api_gateway_method" "put_task" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.task_by_id.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "put_task_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.task_by_id.id
  http_method             = aws_api_gateway_method.put_task.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.update_task_lambda_arn}/invocations"
}

# ---------------------------------------------------------------------------------------------------------------------
# POST /tasks/{id}/assign
# ---------------------------------------------------------------------------------------------------------------------

resource "aws_api_gateway_method" "assign_task" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.assign.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "assign_task_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.assign.id
  http_method             = aws_api_gateway_method.assign_task.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.assign_task_lambda_arn}/invocations"
}

# ---------------------------------------------------------------------------------------------------------------------
# GET /users
# ---------------------------------------------------------------------------------------------------------------------

resource "aws_api_gateway_method" "get_users" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.users.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "get_users_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.users.id
  http_method             = aws_api_gateway_method.get_users.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.list_users_lambda_arn}/invocations"
}

# ---------------------------------------------------------------------------------------------------------------------
# CORS (Original manual setup)
# ---------------------------------------------------------------------------------------------------------------------

resource "aws_api_gateway_method" "options" {
  for_each = {
    tasks      = aws_api_gateway_resource.tasks.id
    task_by_id = aws_api_gateway_resource.task_by_id.id
    users      = aws_api_gateway_resource.users.id
    assign     = aws_api_gateway_resource.assign.id
  }

  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = each.value
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options" {
  for_each = {
    tasks      = aws_api_gateway_resource.tasks.id
    task_by_id = aws_api_gateway_resource.task_by_id.id
    users      = aws_api_gateway_resource.users.id
    assign     = aws_api_gateway_resource.assign.id
  }

  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = each.value
  http_method = "OPTIONS"
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options" {
  for_each = {
    tasks      = aws_api_gateway_resource.tasks.id
    task_by_id = aws_api_gateway_resource.task_by_id.id
    users      = aws_api_gateway_resource.users.id
    assign     = aws_api_gateway_resource.assign.id
  }

  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = each.value
  http_method = "OPTIONS"
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options" {
  for_each = {
    tasks      = aws_api_gateway_resource.tasks.id
    task_by_id = aws_api_gateway_resource.task_by_id.id
    users      = aws_api_gateway_resource.users.id
    assign     = aws_api_gateway_resource.assign.id
  }

  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = each.value
  http_method = "OPTIONS"
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${var.allowed_origins[0]}'"
  }

  depends_on = [aws_api_gateway_method_response.options]
}
