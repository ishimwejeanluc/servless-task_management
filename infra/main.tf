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
  source      = "./modules/dynamodb"

  tags        = var.tags
}

module "cognito" {
  source                = "./modules/cognito"

  tags                  = var.tags
  pre_signup_lambda_arn = module.lambda_pre_signup.function_arn
}

module "api_gateway" {
  source                = "./modules/api-gateway"

  tags                  = var.tags
  cognito_user_pool_arn = module.cognito.user_pool_arn
  
  create_task_lambda_arn = module.lambda_create_task.function_arn
  get_tasks_lambda_arn   = module.lambda_get_tasks.function_arn
  update_task_lambda_arn = module.lambda_update_task.function_arn
  assign_task_lambda_arn = module.lambda_assign_task.function_arn
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
}

data "archive_file" "pre_signup" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/preSignUp"
  output_path = "${path.module}/builds/preSignUp.zip"
}

data "archive_file" "notification_handler" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/functions/notificationHandler"
  output_path = "${path.module}/builds/notificationHandler.zip"
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
  }
}

module "lambda_assign_task" {
  source        = "./modules/lambda"
  function_name = "TaskManagement_AssignTask"
  role_arn      = module.iam.assign_task_role_arn
  filename      = data.archive_file.assign_task.output_path
  tags          = var.tags

  environment_variables = {
    DYNAMODB_TABLE_NAME = module.dynamodb.table_name
    COGNITO_USER_POOL_ID = module.cognito.user_pool_id
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
  source                   = "./modules/notifications"
  
  tags                     = var.tags
  system_email             = var.system_email
  notification_lambda_arn  = module.lambda_notification_handler.function_arn
}
