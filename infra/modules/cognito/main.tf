resource "aws_cognito_user_pool" "main" {
  name = "task-users"
  auto_verified_attributes = ["email"]
  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }
  mfa_configuration = "OFF"
  schema {
    name                     = "email"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = true
    string_attribute_constraints {
      min_length = 5
      max_length = 2048
    }
  }

  lambda_config {
    pre_sign_up       = var.pre_signup_lambda_arn != "" ? var.pre_signup_lambda_arn : null
    post_confirmation = var.post_confirmation_lambda_arn != "" ? var.post_confirmation_lambda_arn : null
  }

  tags = var.tags
}

resource "aws_lambda_permission" "cognito_presignup" {
  statement_id  = "AllowCognitoInvokePreSignUp"
  action        = "lambda:InvokeFunction"
  function_name = var.pre_signup_lambda_arn
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

resource "aws_lambda_permission" "cognito_postconfirmation" {
  statement_id  = "AllowCognitoInvokePostConfirmation"
  action        = "lambda:InvokeFunction"
  function_name = var.post_confirmation_lambda_arn
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

resource "aws_cognito_user_pool_client" "web" {
  name                                 = "web-client"
  user_pool_id                         = aws_cognito_user_pool.main.id
  generate_secret                      = false
  explicit_auth_flows                  = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]
  prevent_user_existence_errors        = "ENABLED"
}
resource "aws_cognito_user_group" "admin" {
  name         = "Admin"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Administrator privileges"
}
resource "aws_cognito_user_group" "member" {
  name         = "Member"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Standard Member access"
}

# Bootstrap admin user and group assignments
resource "aws_cognito_user" "admin" {
  user_pool_id = aws_cognito_user_pool.main.id
  username     = "jeanluc.ishimwe@amalitech.com"
  attributes = {
    email = "jeanluc.ishimwe@amalitech.com"
    email_verified = true
  }
  lifecycle {
    ignore_changes = [attributes["email_verified"]]
  }
  temporary_password = "TempPassword123!"

  depends_on = [
    aws_lambda_permission.cognito_presignup,
    aws_lambda_permission.cognito_postconfirmation
  ]
}

resource "aws_cognito_user_in_group" "admin" {
  user_pool_id = aws_cognito_user_pool.main.id
  username     = aws_cognito_user.admin.username
  group_name   = aws_cognito_user_group.admin.name
}


