data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}


resource "aws_iam_role" "create_task_role" {
  name               = "TaskManagement_CreateTaskRole"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}
resource "aws_iam_role_policy_attachment" "create_task_basic" {
  role       = aws_iam_role.create_task_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
resource "aws_iam_role_policy" "create_task_policy" {
  name = "CreateTaskPolicy"
  role = aws_iam_role.create_task_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:PutItem"]
      Resource = var.dynamodb_table_arn
    }]
  })
}


resource "aws_iam_role" "get_tasks_role" {
  name               = "TaskManagement_GetTasksRole"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}
resource "aws_iam_role_policy_attachment" "get_tasks_basic" {
  role       = aws_iam_role.get_tasks_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
resource "aws_iam_role_policy" "get_tasks_policy" {
  name = "GetTasksPolicy"
  role = aws_iam_role.get_tasks_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:Query", "dynamodb:Scan", "dynamodb:GetItem"]
      Resource = [var.dynamodb_table_arn, "${var.dynamodb_table_arn}/index/*"]
    }]
  })
}


resource "aws_iam_role" "update_task_role" {
  name               = "TaskManagement_UpdateTaskRole"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}
resource "aws_iam_role_policy_attachment" "update_task_basic" {
  role       = aws_iam_role.update_task_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
resource "aws_iam_role_policy" "update_task_policy" {
  name = "UpdateTaskPolicy"
  role = aws_iam_role.update_task_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:UpdateItem", "dynamodb:GetItem"]
        Resource = var.dynamodb_table_arn
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = var.sns_topic_arn
      }
    ]
  })
}

# -----------------------------------------------------
# ASSIGN TASK ROLE (UpdateItem, GetItem + SNS Publish)
# -----------------------------------------------------
resource "aws_iam_role" "assign_task_role" {
  name               = "TaskManagement_AssignTaskRole"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}
resource "aws_iam_role_policy_attachment" "assign_task_basic" {
  role       = aws_iam_role.assign_task_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
resource "aws_iam_role_policy" "assign_task_policy" {
  name = "AssignTaskPolicy"
  role = aws_iam_role.assign_task_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:UpdateItem", "dynamodb:GetItem"]
        Resource = var.dynamodb_table_arn
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = var.sns_topic_arn
      }
    ]
  })
}


resource "aws_iam_role" "pre_signup_role" {
  name               = "TaskManagement_PreSignupRole"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}
resource "aws_iam_role_policy_attachment" "pre_signup_basic" {
  role       = aws_iam_role.pre_signup_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}


resource "aws_iam_role" "notification_handler_role" {
  name               = "TaskManagement_NotificationHandlerRole"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}
resource "aws_iam_role_policy_attachment" "notification_handler_basic" {
  role       = aws_iam_role.notification_handler_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
resource "aws_iam_role_policy" "notification_handler_policy" {
  name = "NotificationHandlerPolicy"
  role = aws_iam_role.notification_handler_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem"]
        Resource = var.dynamodb_table_arn
      }
    ]
  })
}
