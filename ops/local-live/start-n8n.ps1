$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$env:N8N_USER_FOLDER = Join-Path $PSScriptRoot 'runtime/n8n-userdata'
$env:N8N_LISTEN_ADDRESS = '127.0.0.1'
$env:N8N_HOST = '127.0.0.1'
$env:N8N_PORT = '5678'
$env:N8N_PUBLIC_API_DISABLED = 'true'
$env:N8N_PUBLIC_API_SWAGGERUI_DISABLED = 'true'
$env:N8N_DIAGNOSTICS_ENABLED = 'false'
$env:N8N_PERSONALIZATION_ENABLED = 'false'
$env:N8N_VERSION_NOTIFICATIONS_ENABLED = 'false'
$env:N8N_TEMPLATES_ENABLED = 'false'
$env:N8N_COMMUNITY_PACKAGES_ENABLED = 'false'
$env:N8N_UNVERIFIED_PACKAGES_ENABLED = 'false'
$env:NODES_EXCLUDE = '["n8n-nodes-base.executeCommand","n8n-nodes-base.localFileTrigger","n8n-nodes-base.readWriteFile","n8n-nodes-base.readBinaryFile","n8n-nodes-base.writeBinaryFile","n8n-nodes-base.ssh","n8n-nodes-base.sftp","n8n-nodes-base.ftp"]'
Set-Location $root
& node (Join-Path $root 'ops/local-live/runtime/n8n/node_modules/n8n/bin/n8n') start
