terraform {
  required_providers {
    render = {
      source  = "render-oss/render"
      version = "~> 1.9.1"
    }
  }
}

resource "render_web_service" "rems_api" {
  name           = "rems-api"
  plan           = "free"
  region         = "oregon"
  root_directory = "backend"
  start_command  = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"

  runtime_source = {
    native_runtime = {
      runtime           = "python"
      repo_url          = "https://github.com/jliu0411/CMPE272-Project"
      branch            = "main"
      build_command     = "pip install -r requirements.txt"
      auto_deploy       = true
      health_check_path = "/health"
    }
  }

  lifecycle {
    ignore_changes = [env_vars]
  }
}

output "rems_api_url" {
  value = render_web_service.rems_api.url
}