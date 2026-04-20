resource "aws_lambda_function" "function" {
  function_name = "${var.function_name}"
  handler       = var.handler
  runtime       = var.runtime
  role          = var.role_arn
  filename         = var.filename
  source_code_hash = filebase64sha256(var.filename)
  memory_size = var.memory_size
  timeout     = var.timeout
  dynamic "environment" {
    for_each = length(keys(var.environment_variables)) > 0 ? [1] : []
    content {
      variables = var.environment_variables
    }
  }
  tags = var.tags
}
