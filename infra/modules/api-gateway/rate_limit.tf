
resource "aws_api_gateway_usage_plan" "main" {
  name        = "task-usage-plan"
  description = "Global usage plan to protect compute layer"

 
  api_stages {
    api_id = aws_api_gateway_rest_api.api.id
    stage = aws_api_gateway_stage.main.stage_name
  }

  quota_settings {
    limit  = 10000  
    period = "MONTH"
  }

  # Micro-burst protection
  throttle_settings {
    burst_limit = 100  # Max concurrent concurrent spikes
    rate_limit  = 50   # Steady-state requests per second
  }
}



resource "aws_api_gateway_request_validator" "body_only" {
  name                        = "validate-body"
  rest_api_id                 = aws_api_gateway_rest_api.api.id
  validate_request_body       = true
  validate_request_parameters = false
}

resource "aws_api_gateway_request_validator" "params_only" {
  name                        = "validate-params"
  rest_api_id                 = aws_api_gateway_rest_api.api.id
  validate_request_body       = false
  validate_request_parameters = true
}
