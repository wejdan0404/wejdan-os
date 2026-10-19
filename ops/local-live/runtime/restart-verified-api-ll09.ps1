param(
  [int]$ExpectedPid = 45096,
  [string]$ExpectedCreatedAt = '2026-10-18 11:35:46'
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$node = 'C:\Program Files\nodejs\node.exe'
$entry = Join-Path $root 'ops/local-live/runtime/server.mjs'
$inspectScript = Join-Path $root 'ops/local-live/runtime/inspect-sqlite-facts.mjs'
$dbPath = Join-Path $root 'ops/local-live/data/wejdan-local.sqlite'
$snapshotPath = Join-Path $root 'ops/history/20261018-ll09-pre-restart-v2-wejdan-local.sqlite'
$expectedSnapshotHash = 'E7537C800F961FD8DB6D4CE7C55B5D5B9A56B776DA66DF48B77506D255CCFAB6'

function Get-DbFacts([string]$Path) {
  $output = & $node $inspectScript $Path
  if ($LASTEXITCODE -ne 0) { throw "SQLITE_FACTS_PROCESS_FAILED:$Path" }
  return ($output | ConvertFrom-Json)
}

$process = Get-CimInstance Win32_Process -Filter "ProcessId=$ExpectedPid"
if (-not $process) { throw 'EXPECTED_API_PROCESS_NOT_FOUND' }
$ownerResult = Invoke-CimMethod -InputObject $process -MethodName GetOwner
$processOwner = "$($ownerResult.Domain)\$($ownerResult.User)"
$currentOwner = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$created = ([datetime]$process.CreationDate).ToString('yyyy-MM-dd HH:mm:ss')
$parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($process.ParentProcessId)"
if ($process.Name -ne 'node.exe' -or $process.ExecutablePath -ne $node -or $process.CommandLine -notmatch [regex]::Escape('ops/local-live/runtime/server.mjs')) { throw 'API_PROCESS_IDENTITY_MISMATCH' }
if ($created -ne $ExpectedCreatedAt) { throw "API_PROCESS_START_TIME_MISMATCH:$created" }
if ($processOwner -ne $currentOwner) { throw 'API_PROCESS_OWNER_MISMATCH' }
if (-not $parent -or $parent.Name -notin @('pwsh.exe','powershell.exe') -or $parent.CommandLine -notmatch [regex]::Escape('ops/local-live/runtime/server.mjs')) { throw 'API_PARENT_LAUNCHER_MISMATCH' }
$listeners = @(Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 8766 -State Listen)
if ($listeners.Count -ne 1 -or $listeners[0].OwningProcess -ne $ExpectedPid) { throw 'API_LISTENER_OWNERSHIP_MISMATCH' }
$health = Invoke-RestMethod 'http://127.0.0.1:8766/api/health' -TimeoutSec 5
if ($health.service -ne 'wejdan-local-runtime' -or $health.bind -ne '127.0.0.1') { throw 'API_HEALTH_IDENTITY_MISMATCH' }
$db = Get-DbFacts $dbPath
if ($db.integrity -ne 'ok' -or $db.tasks -ne 118 -or $db.active -ne 0 -or $db.codex -ne 0 -or -not $db.guard) { throw "LIVE_DATABASE_PRECONDITION_FAILED:$($db | ConvertTo-Json -Compress)" }
if (-not (Test-Path $snapshotPath) -or (Get-FileHash $snapshotPath -Algorithm SHA256).Hash -ne $expectedSnapshotHash) { throw 'VERIFIED_SNAPSHOT_MISSING_OR_HASH_MISMATCH' }
$snapshot = Get-DbFacts $snapshotPath
if ($snapshot.integrity -ne 'ok' -or $snapshot.tasks -ne $db.tasks -or $snapshot.steps -ne $db.steps -or $snapshot.memory -ne $db.memory -or -not $snapshot.guard) { throw 'SNAPSHOT_VALIDATION_FAILED' }

[pscustomobject]@{ phase='precondition-pass'; pid=$ExpectedPid; owner=$processOwner; created_at=$created; executable=$process.ExecutablePath; command_line=$process.CommandLine; parent_pid=$process.ParentProcessId; health=$health; database=$db; snapshot=$snapshot; snapshot_sha256=$expectedSnapshotHash } | ConvertTo-Json -Depth 5

# Authorized once by the executive directive for this exact verified obsolete Life OS API process.
Stop-Process -Id $ExpectedPid -ErrorAction Stop
$deadline = (Get-Date).AddSeconds(8)
do {
  Start-Sleep -Milliseconds 250
  $listeners = @(Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 8766 -State Listen -ErrorAction SilentlyContinue)
} while ($listeners.Count -gt 0 -and (Get-Date) -lt $deadline)
if ($listeners.Count -gt 0) { throw 'OLD_API_LISTENER_REMAINS_AFTER_CONTROLLED_STOP' }
$postStop = Get-DbFacts $dbPath
if ($postStop.integrity -ne 'ok' -or $postStop.tasks -ne $db.tasks -or $postStop.steps -ne $db.steps -or $postStop.memory -ne $db.memory -or -not $postStop.guard) { throw 'DATABASE_RECOVERY_CHECK_FAILED_AFTER_STOP' }

$logDir = Join-Path $root 'ops/local-live/logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stdout = Join-Path $logDir "api-$stamp.stdout.log"
$stderr = Join-Path $logDir "api-$stamp.stderr.log"
$newProcess = Start-Process -FilePath $node -ArgumentList @($entry) -WorkingDirectory $root -UseNewEnvironment -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
$health = $null
$deadline = (Get-Date).AddSeconds(25)
do {
  Start-Sleep -Milliseconds 500
  try { $health = Invoke-RestMethod 'http://127.0.0.1:8766/api/health' -TimeoutSec 2 } catch { }
} while (-not $health -and (Get-Date) -lt $deadline)
if (-not $health) { throw "NEW_API_START_FAILED:$newProcess.Id; stderr=$((Get-Content $stderr -Raw -ErrorAction SilentlyContinue))" }
$status = Invoke-RestMethod 'http://127.0.0.1:8766/api/provider-status' -TimeoutSec 5
if ($status.dispatch_enabled -ne $false -or $status.dispatch_block_reason -ne 'CODEX_APP_LIVE_APPROVAL_REQUIRED') { throw 'CODEX_DISPATCH_GUARD_NOT_ACTIVE_AFTER_RESTART' }
$states = @($status.states)
$e2e = $states | Where-Object { $_.state_key -eq 'APP_CODEX_E2E_LIVE_VERIFIED' }
if (-not $e2e -or $e2e.status -ne 'NOT_VERIFIED') { throw 'APP_CODEX_E2E_STATUS_UNEXPECTED' }
$newFacts = Get-DbFacts $dbPath
if ($newFacts.integrity -ne 'ok' -or $newFacts.tasks -ne $db.tasks -or $newFacts.active -ne 0 -or $newFacts.codex -ne 0 -or -not $newFacts.guard) { throw 'DATABASE_POST_RESTART_CHECK_FAILED' }
$newCim = Get-CimInstance Win32_Process -Filter "ProcessId=$($newProcess.Id)"
$newListener = @(Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 8766 -State Listen)
if (-not $newCim -or $newCim.ExecutablePath -ne $node -or $newCim.CommandLine -notmatch [regex]::Escape($entry) -or $newListener.Count -ne 1 -or $newListener[0].OwningProcess -ne $newProcess.Id) { throw 'NEW_API_PROCESS_IDENTITY_MISMATCH' }
[pscustomobject]@{ result='PASS'; old_pid=$ExpectedPid; new_pid=$newProcess.Id; new_created_at=$newCim.CreationDate; listener='127.0.0.1:8766'; health=$health; provider_status=$status; database=$newFacts; stdout_log=$stdout; stderr_log=$stderr; live_codex_calls=0; paid_api_calls=0 } | ConvertTo-Json -Depth 7
