resource "aws_amplify_app" "zenith_task" {
  name       = "zenith-task-manager"
  repository = var.repository_url
  access_token = var.access_token

  build_spec = <<-EOT
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci --prefix frontend
        build:
          commands:
            - npm run build --prefix frontend
      artifacts:
        baseDirectory: frontend/build
        files:
          - '**/*'
      cache:
        paths:
          - frontend/node_modules/**/*
  EOT

  # 1. Handle the main Single Page Application routes
  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>"
    status = "200"
    target = "/index.html"
  }

  # 2. Catch-all for deep-linked routes
  custom_rule {
    source = "/<*>"
    status = "404-200"
    target = "/index.html"
  }

  tags = var.tags
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.zenith_task.id
  branch_name = "main"

  framework        = "React"
  stage            = "PRODUCTION"
  enable_auto_build = true

  environment_variables = {
    REACT_APP_USER_POOL_ID  = var.user_pool_id
    REACT_APP_APP_CLIENT_ID = var.app_client_id
    REACT_APP_API_URL       = var.api_url
    REACT_APP_REGION        = var.aws_region
  }
}