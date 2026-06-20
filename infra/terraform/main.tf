# infra/terraform — scheduled jobs on AWS Lambda via EventBridge.
#
# One container image, two Lambda functions (the handler is overridden per
# function via image_config.command), two EventBridge schedule rules:
#   verifier  — daily  — prunes dead/expired resources (bank self-cleans)
#   discovery — daily  — grows the bank from trusted hubs/search into review
#
# Workflow:
#   1. terraform apply -target=aws_ecr_repository.jobs   (create the repo)
#   2. docker build/push the image (see README "Deployment")
#   3. terraform apply                                    (everything else)

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ---------- Image registry ----------

resource "aws_ecr_repository" "jobs" {
  name                 = "${var.project}-jobs"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

locals {
  image_uri = "${aws_ecr_repository.jobs.repository_url}:${var.image_tag}"

  jobs = {
    verifier = {
      handler     = "lambda_handler.verifier_handler"
      schedule    = var.verifier_schedule
      description = "Daily resource verification: valid / stale / unverifiable"
    }
    discovery = {
      handler     = "lambda_handler.discovery_handler"
      schedule    = var.discovery_schedule
      description = "Daily discovery from trusted hubs and search into the review queue"
    }
  }
}

# ---------- IAM ----------

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "jobs" {
  name               = "${var.project}-jobs"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

# CloudWatch Logs write access — the only AWS permission the jobs need;
# everything else they touch (Postgres, OpenAI, the web) is outside AWS.
resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.jobs.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ---------- Lambda functions ----------

resource "aws_lambda_function" "job" {
  for_each = local.jobs

  function_name = "${var.project}-${each.key}"
  description   = each.value.description
  role          = aws_iam_role.jobs.arn

  package_type  = "Image"
  image_uri     = local.image_uri
  architectures = ["x86_64"]

  image_config {
    command = [each.value.handler]
  }

  timeout     = 300 # batch of fetches + LLM calls; well under the cap
  memory_size = 512

  environment {
    variables = {
      OPENAI_API_KEY       = var.openai_api_key
      DATABASE_URL         = var.database_url
      BRAVE_SEARCH_API_KEY = var.brave_search_api_key
    }
  }
}

resource "aws_cloudwatch_log_group" "job" {
  for_each = local.jobs

  name              = "/aws/lambda/${aws_lambda_function.job[each.key].function_name}"
  retention_in_days = 30
}

# ---------- EventBridge schedules ----------

resource "aws_cloudwatch_event_rule" "job" {
  for_each = local.jobs

  name                = "${var.project}-${each.key}"
  description         = each.value.description
  schedule_expression = each.value.schedule
}

resource "aws_cloudwatch_event_target" "job" {
  for_each = local.jobs

  rule = aws_cloudwatch_event_rule.job[each.key].name
  arn  = aws_lambda_function.job[each.key].arn
}

resource "aws_lambda_permission" "eventbridge" {
  for_each = local.jobs

  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.job[each.key].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.job[each.key].arn
}
