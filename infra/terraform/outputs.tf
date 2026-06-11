output "ecr_repository_url" {
  description = "Push the jobs image here (docker push <url>:<tag>)"
  value       = aws_ecr_repository.jobs.repository_url
}

output "lambda_function_names" {
  description = "Deployed job functions"
  value       = { for k, f in aws_lambda_function.job : k => f.function_name }
}

output "schedules" {
  description = "EventBridge schedule per job"
  value       = { for k, r in aws_cloudwatch_event_rule.job : k => r.schedule_expression }
}
