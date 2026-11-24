terraform {
  required_version = ">= 1.5.0"

  required_providers {
    netlify = {
      source  = "netlify/netlify"
      version = "~> 0.4.4"
    }
  }
}

variable "netlify_site_id" {
  description = "Project ID of rems-front in Netlify."
  type        = string
  default     = "e610ea1f-2692-4d84-957d-aa18bef3ef10"
}

variable "netlify_team_id" {
  description = "ID of the Netlify team that owns the REMS project."
  type        = string
}

variable "supabase_url" {
  description = "Public project URL for the Supabase project used by REMS."
  type        = string
}

variable "supabase_publishable_key" {
  description = "Browser-safe Supabase publishable key used by REMS."
  type        = string

  validation {
    condition     = startswith(var.supabase_publishable_key, "sb_publishable_")
    error_message = "Use the Supabase publishable key that starts with sb_publishable_."
  }
}

variable "rems_api_url" {
  description = "Base URL of the REMS API on Render, without a trailing slash."
  type        = string
  default     = "https://rems-api-xa86.onrender.com"
}

import {
  to = netlify_site_build_settings.rems_frontend
  id = var.netlify_site_id
}

resource "netlify_site_build_settings" "rems_frontend" {
  site_id           = var.netlify_site_id
  production_branch = "main"
  base_directory    = "frontend"
  build_command     = "npm run build"
  publish_directory = "dist"

  lifecycle {
    ignore_changes = [
      branch_deploy_all_branches,
      branch_deploy_branches,
      deploy_previews,
      functions_directory,
      package_directory,
      pretty_urls,
      prevent_non_git_prod_deploys,
      stop_builds,
      waf_policy_id,
    ]
  }
}

resource "netlify_environment_variable" "rems_frontend" {
  for_each = {
    VITE_API_URL                  = var.rems_api_url
    VITE_SUPABASE_URL             = var.supabase_url
    VITE_SUPABASE_PUBLISHABLE_KEY = var.supabase_publishable_key
  }

  team_id = var.netlify_team_id
  site_id = var.netlify_site_id
  key     = each.key
  values = [{
    context = "all"
    value   = each.value
  }]
}

