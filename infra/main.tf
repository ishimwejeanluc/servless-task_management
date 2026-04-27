terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.tags
  }
}

module "dynamodb" {
  source = "./modules/dynamodb"

  tags = var.tags
}

module "cognito" {
  source = "./modules/cognito"

  tags                         = var.tags
  pre_signup_lambda_arn        = module.lambda_pre_signup.function_arn
  post_confirmation_lambda_arn = module.lambda_post_confirmation.function_arn
}

module "api_gateway" {
  source = "./modules/api-gateway"

  tags                  = var.tags
  cognito_user_pool_arn = module.cognito.user_pool_arn

  create_task_lambda_arn = module.lambda_create_task.function_arn
  get_tasks_lambda_arn   = module.lambda_get_tasks.function_arn
  update_task_lambda_arn = module.lambda_update_task.function_arn
  assign_task_lambda_arn = module.lambda_assign_task.function_arn
  list_users_lambda_arn  = module.lambda_list_users.function_arn

  # Pass the full live URL and local dev URL to the API
  allowed_origins = [module.hosting.frontend_url, "http://localhost:3000"]
}

module "hosting" {
  source         = "./modules/hosting"
  tags           = var.tags
  user_pool_id   = module.cognito.user_pool_id
  app_client_id  = module.cognito.user_pool_client_id
  api_url        = module.api_gateway.invoke_url
  aws_region     = var.aws_region
  repository_url = var.repository_url
  access_token   = var.github_token
}

module "iam" {
  source = "./modules/iam"

  dynamodb_table_arn = module.dynamodb.table_arn
  sns_topic_arn      = module.notifications.sns_topic_arn
}


data "archive_file" "create_task" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/createTask"
  output_path = "${path.module}/builds/createTask.zip"
}

data "archive_file" "get_tasks" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/getTasks"
  output_path = "${path.module}/builds/getTasks.zip"
}

data "archive_file" "update_task" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/updateTask"
  output_path = "${path.module}/builds/updateTask.zip"
}

data "archive_file" "assign_task" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/assignTask"
  output_path = "${path.module}/builds/assignTask.zip"
  excludes    = ["node_modules", "package-lock.json", ".DS_Store"]
}

data "archive_file" "pre_signup" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/preSignUp"
  output_path = "${path.module}/builds/preSignUp.zip"
}

data "archive_file" "post_confirmation" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/postConfirmation"
  output_path = "${path.module}/builds/postConfirmation.zip"
}

data "archive_file" "notification_handler" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/notificationHandler"
  output_path = "${path.module}/builds/notificationHandler.zip"
}
data "archive_file" "list_users" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/listUsers"
  output_path = "${path.module}/builds/listUsers.zip"
}

# --- Lambda Deployments ---
module "lambda_create_task" {
  source        = "./modules/lambda"
  function_name = "TaskManagement_CreateTask"
  role_arn      = module.iam.create_task_role_arn
  filename      = data.archive_file.create_task.output_path
  tags          = var.tags

  environment_variables = {
    DYNAMODB_TABLE_NAME = module.dynamodb.table_name
    SNS_TOPIC_ARN       = module.notifications.sns_topic_arn
    ALLOWED_ORIGIN      = module.hosting.default_domain
  }
}

module "lambda_get_tasks" {
  source        = "./modules/lambda"
  function_name = "TaskManagement_GetTasks"
  role_arn      = module.iam.get_tasks_role_arn
  filename      = data.archive_file.get_tasks.output_path
  tags          = var.tags

  environment_variables = {
    DYNAMODB_TABLE_NAME = module.dynamodb.table_name
    ALLOWED_ORIGIN      = module.hosting.default_domain
  }
}

module "lambda_update_task" {
  source        = "./modules/lambda"
  function_name = "TaskManagement_UpdateTask"
  role_arn      = module.iam.update_task_role_arn
  filename      = data.archive_file.update_task.output_path
  tags          = var.tags

  environment_variables = {
    DYNAMODB_TABLE_NAME = module.dynamodb.table_name
    SNS_TOPIC_ARN       = module.notifications.sns_topic_arn
    ALLOWED_ORIGIN      = module.hosting.default_domain
  }
}

module "lambda_assign_task" {
  source        = "./modules/lambda"
  function_name = "TaskManagement_AssignTask"
  role_arn      = module.iam.assign_task_role_arn
  filename      = data.archive_file.assign_task.output_path
  tags          = var.tags

  environment_variables = {
    DYNAMODB_TABLE_NAME  = module.dynamodb.table_name
    COGNITO_USER_POOL_ID = module.cognito.user_pool_id
    SNS_TOPIC_ARN        = module.notifications.sns_topic_arn
    ALLOWED_ORIGIN       = module.hosting.default_domain
  }
}

module "lambda_list_users" {
  source        = "./modules/lambda"
  function_name = "TaskManagement_ListUsers"
  role_arn      = module.iam.list_users_role_arn
  filename      = data.archive_file.list_users.output_path
  tags          = var.tags

  environment_variables = {
    DYNAMODB_TABLE_NAME  = module.dynamodb.table_name
    COGNITO_USER_POOL_ID = module.cognito.user_pool_id
    ALLOWED_ORIGIN       = module.hosting.default_domain
  }
}

module "lambda_pre_signup" {
  source        = "./modules/lambda"
  function_name = "TaskManagement_PreSignUp"
  role_arn      = module.iam.pre_signup_role_arn
  filename      = data.archive_file.pre_signup.output_path
  tags          = var.tags

  environment_variables = {}
}

module "lambda_post_confirmation" {
  source        = "./modules/lambda"
  function_name = "TaskManagement_PostConfirmation"
  role_arn      = module.iam.post_confirmation_role_arn
  filename      = data.archive_file.post_confirmation.output_path
  tags          = var.tags

  environment_variables = {
    BOOTSTRAP_ADMIN_USERNAME = "jeanluc.ishimwe@amalitech.com"
    BOOTSTRAP_ADMIN_EMAIL    = "jeanluc.ishimwe@amalitech.com"
    MEMBER_GROUP_NAME        = "Member"
  }
}

module "lambda_notification_handler" {
  source        = "./modules/lambda"
  function_name = "TaskManagement_NotificationHandler"
  role_arn      = module.iam.notification_handler_role_arn
  filename      = data.archive_file.notification_handler.output_path
  tags          = var.tags

  environment_variables = {
    SYSTEM_EMAIL = var.system_email
  }
}

module "notifications" {
  source = "./modules/notifications"

  tags                    = var.tags
  system_email            = var.system_email
  notification_lambda_arn = module.lambda_notification_handler.function_arn
}
