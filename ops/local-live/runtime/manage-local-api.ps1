param(
  [ValidateSet('status','start','stop','restart')]
  [string]$Action = 'status'
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$node = 'C:\Program Files\nodejs\node.exe'
$entry = Join-Path $root 'ops/local-live/runtime/server.mjs'
$dbPath = Join-Path $root 'ops/local-live/data/wejdan-local.sqlite'
$factsScript = Join-Path $root 'ops/local-live/runtime/inspect-sqlite-facts.mjs'
$snapshotScript = Join-Path $root 'ops/local-live/runtime/snapshot-local-db.mjs'
$historyDir = Join-Path $root 'ops/history'
$tokenPath = Join-Path $root 'ops/local-live/private/api-control.dpapi'
$apiUrl = 'http://127.0.0.1:8766'

function Get-ApiListener {
  # Preserve a one-item array: Windows PowerShell 5 unwraps function output,
  # leaving a single CimInstance without a usable .Count property.
  return ,@(Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort 8766 -State Listen -ErrorAction SilentlyContinue)
}
function Get-DbFacts {
  $raw = & $node $factsScript $dbPath
  if ($LASTEXITCODE -ne 0) { throw 'SQLITE_INSPECTION_FAILED' }
  return ($raw | ConvertFrom-Json)
}
function Get-ProcessIdentity([int]$ProcessId) {
  $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId"
  if (-not $proc -or $proc.Name -ne 'node.exe' -or $proc.ExecutablePath -ne $node -or $proc.CommandLine -notmatch [regex]::Escape($entry)) { throw "API_PROCESS_IDENTITY_MISMATCH:$ProcessId" }
  $owner = Invoke-CimMethod -InputObject $proc -MethodName GetOwner
  $actualOwner = "$($owner.Domain)\$($owner.User)"
  $currentOwner = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  if ($actualOwner -ne $currentOwner) { throw 'API_PROCESS_OWNER_MISMATCH' }
  return $proc
}
function Get-ControlToken {
  if (-not (Test-Path $tokenPath)) {
    New-Item -ItemType Directory -Force -Path (Split-Path $tokenPath) | Out-Null
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $plain = [Convert]::ToHexString($bytes).ToLowerInvariant()
    $protected = ConvertTo-SecureString -String $plain -AsPlainText -Force | ConvertFrom-SecureString
    Set-Content -LiteralPath $tokenPath -Value $protected -NoNewline
  }
  $protected = Get-Content -LiteralPath $tokenPath -Raw
  $secure = ConvertTo-SecureString -String $protected
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
function Get-Status {
  $listeners = Get-ApiListener
  if ($listeners.Count -eq 0) { return [pscustomobject]@{ result='STOPPED'; listener='127.0.0.1:8766'; active_tasks=$null } }
  if ($listeners.Count -ne 1) { throw "DUPLICATE_API_LISTENERS:$($listeners.Count)" }
  $proc = Get-ProcessIdentity ([int]$listeners[0].OwningProcess)
  $health = Invoke-RestMethod "$apiUrl/api/health" -TimeoutSec 5
  $provider = Invoke-RestMethod "$apiUrl/api/provider-status" -TimeoutSec 5
  if ($health.service -ne 'wejdan-local-runtime' -or $health.bind -ne '127.0.0.1' -or $provider.dispatch_enabled -ne $false) { throw 'API_HEALTH_OR_PROVIDER_GUARD_FAILED' }
  return [pscustomobject]@{ result='PASS'; pid=[int]$proc.ProcessId; created_at=$proc.CreationDate; listener='127.0.0.1:8766'; health=$health; provider_dispatch_enabled=$provider.dispatch_enabled; dispatch_block_reason=$provider.dispatch_block_reason }
}
function Start-Api {
  $listeners = Get-ApiListener
  if ($listeners.Count -gt 0) { return Get-Status }
  if (-not (Test-Path $entry) -or -not (Test-Path $dbPath)) { throw 'API_SOURCE_OR_DATABASE_MISSING' }
  $facts = Get-DbFacts
  if ($facts.integrity -ne 'ok' -or $facts.active -ne 0 -or $facts.codex -ne 0 -or -not $facts.guard) { throw 'API_START_DATABASE_PRECONDITION_FAILED' }
  $token = Get-ControlToken
  $logDir = Join-Path $root 'ops/local-live/logs'
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $stdout = Join-Path $logDir "api-$stamp.stdout.log"
  $stderr = Join-Path $logDir "api-$stamp.stderr.log"
  $prior = $env:WEJDAN_API_CONTROL_TOKEN
  $hqEnvPath = Join-Path $root 'ops/local-live/private/hq.env'
  $hqTokenLine = Get-Content -LiteralPath $hqEnvPath -ErrorAction Stop | Where-Object { $_ -match '^HQ_PERSONAL_READ_TOKEN=' } | Select-Object -First 1
  if (-not $hqTokenLine) { throw 'HQ_PERSONAL_READ_TOKEN_MISSING_FROM_PRIVATE_CONFIG' }
  $priorHqToken = $env:HQ_PERSONAL_READ_TOKEN
  try {
    $env:WEJDAN_API_CONTROL_TOKEN = $token
    $env:HQ_PERSONAL_READ_TOKEN = $hqTokenLine.Substring('HQ_PERSONAL_READ_TOKEN='.Length)
    if ($env:HQ_PERSONAL_READ_TOKEN.Length -lt 43) { throw 'HQ_PERSONAL_READ_TOKEN_INVALID' }
    $started = Start-Process -FilePath $node -ArgumentList @($entry) -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
  }
  finally { $env:WEJDAN_API_CONTROL_TOKEN = $prior; $env:HQ_PERSONAL_READ_TOKEN = $priorHqToken }
  $deadline = (Get-Date).AddSeconds(25)
  $status = $null
  do { Start-Sleep -Milliseconds 500; try { $status = Get-Status } catch { } } while (-not $status -and (Get-Date) -lt $deadline)
  if (-not $status -or $status.pid -ne $started.Id) { throw "API_START_FAILED:pid=$($started.Id);stderr=$(Get-Content $stderr -Raw -ErrorAction SilentlyContinue)" }
  return [pscustomobject]@{ result='PASS'; action='start'; status=$status; stdout_log=$stdout; stderr_log=$stderr; database=$facts }
}
function Stop-Api {
  $listeners = Get-ApiListener
  if ($listeners.Count -eq 0) { return [pscustomobject]@{ result='ALREADY_STOPPED' } }
  if ($listeners.Count -ne 1) { throw 'DUPLICATE_API_LISTENERS' }
  $apiProcessId = [int]$listeners[0].OwningProcess
  $proc = Get-ProcessIdentity $apiProcessId
  $status = Invoke-RestMethod "$apiUrl/api/health" -TimeoutSec 5
  if ($status.service -ne 'wejdan-local-runtime' -or $status.bind -ne '127.0.0.1') { throw 'REFUSE_STOP_NON_LIFE_OS_PROCESS' }
  $facts = Get-DbFacts
  if ($facts.integrity -ne 'ok' -or $facts.active -ne 0 -or $facts.codex -ne 0 -or -not $facts.guard) { throw 'API_STOP_DATABASE_PRECONDITION_FAILED' }
  New-Item -ItemType Directory -Force -Path $historyDir | Out-Null
  $snapshot = Join-Path $historyDir ("local-api-before-stop-{0}.sqlite" -f (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
  $snapshotResult = & $node $snapshotScript $dbPath $snapshot
  if ($LASTEXITCODE -ne 0) { throw 'API_STOP_SNAPSHOT_FAILED' }
  $token = Get-ControlToken
  $response = Invoke-RestMethod "$apiUrl/api/control/shutdown" -Method Post -Headers @{ 'x-wejdan-local-control'=$token } -ContentType 'application/json' -Body '{}'
  if ($response.status -ne 'stopping' -or $response.active_tasks -ne 0) { throw 'GRACEFUL_API_STOP_NOT_CONFIRMED' }
  $deadline = (Get-Date).AddSeconds(15)
  do { Start-Sleep -Milliseconds 250; $listeners = Get-ApiListener } while ($listeners.Count -gt 0 -and (Get-Date) -lt $deadline)
  if ($listeners.Count -gt 0 -or (Get-CimInstance Win32_Process -Filter "ProcessId=$apiProcessId")) { throw 'API_DID_NOT_STOP_GRACEFULLY' }
  $after = Get-DbFacts
  if ($after.integrity -ne 'ok' -or $after.tasks -ne $facts.tasks -or $after.steps -ne $facts.steps -or $after.memory -ne $facts.memory -or -not $after.guard) { throw 'API_POST_STOP_DATABASE_MISMATCH' }
  return [pscustomobject]@{ result='PASS'; action='stop'; pid=$apiProcessId; graceful=$true; snapshot=$snapshot; snapshot_facts=($snapshotResult | ConvertFrom-Json).facts; database_after=$after; owner=$proc.ProcessId }
}

switch ($Action) {
  'status' { Get-Status | ConvertTo-Json -Depth 6 }
  'start' { Start-Api | ConvertTo-Json -Depth 7 }
  'stop' { Stop-Api | ConvertTo-Json -Depth 7 }
  'restart' { $stopped = Stop-Api; $started = Start-Api; [pscustomobject]@{ stopped=$stopped; started=$started } | ConvertTo-Json -Depth 8 }
}
