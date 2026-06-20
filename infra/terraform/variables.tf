variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Name prefix for all resources"
  type        = string
  default     = "dreamers-agent"
}

variable "image_tag" {
  description = "Tag of the jobs image pushed to ECR (e.g. a git SHA or 'latest')"
  type        = string
  default     = "latest"
}

variable "openai_api_key" {
  description = "OpenAI API key for the LLM/embedding calls made by the jobs"
  type        = string
  sensitive   = true
}

variable "database_url" {
  description = "Postgres connection string for the resource bank (Supabase)"
  type        = string
  sensitive   = true
}

variable "brave_search_api_key" {
  description = "Optional Brave Search API key for broad web discovery"
  type        = string
  sensitive   = true
  default     = ""
}

variable "verifier_schedule" {
  description = "EventBridge schedule for the verifier (plan: daily)"
  type        = string
  default     = "rate(1 day)"
}

variable "discovery_schedule" {
  description = "EventBridge schedule for discovery (plan: daily)"
  type        = string
  default     = "rate(1 day)"
}
