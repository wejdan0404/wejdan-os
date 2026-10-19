$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$node = 'C:\Program Files\nodejs\node.exe'
$entry = Join-Path $root 'ops/local-live/runtime/server.mjs'
$dbScript = Join-Path $root 'ops/local-live/runtime/inspect-sqlite-facts.mjs'
$dbPath = Join-Path $root 'ops/local-live/data/wejdan-local.sqlite'
$snapshotPath = Join-Path $root 'ops/history/20261018-ll09-pre-restart-v2-wejdan-local.sqlite'
$expectedSnapshotHash = 'E7537C800F961FD8DB6D4CE7C55B5D5B9A56B776DA66DF48B77506D255CCFAB6'
if (-not (Test-Path $entry) -or -not (Test-Path $snapshotPath)) { throw 'API_SOURCE_OR_SNAPSHOT_MISSING' }
if ((Get-FileHash $snapshotPath -Algorithm SHA256).Hash -ne $expectedSnapshotHash) { throw 'API_SNAPSHOT_HASH_MISMATCH' }
$facts = (& $node $dbScript $dbPath | ConvertFrom-Json)
if ($LASTEXITCODE -ne 0 -or $facts.integrity -ne 'ok' -or $facts.tasks -ne 118 -or $facts.active -ne 0 -or $facts.codex -ne 0 -or -not $facts.guard) { throw 'DATABASE_RECOVERY_PRECONDITION_FAILED' }
$listeners = @(Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 8766 -State Listen -ErrorAction SilentlyContinue)
if ($listeners.Count -gt 0) { throw "REFUSE_DUPLICATE_API_LISTENER:$($listeners[0].OwningProcess)" }
$logDir = Join-Path $root 'ops/local-live/logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stdout = Join-Path $logDir "api-$stamp.stdout.log"
$stderr = Join-Path $logDir "api-$stamp.stderr.log"
$process = Start-Process -FilePath $node -ArgumentList @($entry) -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
$health = $null
$deadline = (Get-Date).AddSeconds(25)
do { Start-Sleep -Milliseconds 500; try { $health = Invoke-RestMethod 'http://127.0.0.1:8766/api/health' -TimeoutSec 2 } catch { } } while (-not $health -and (Get-Date) -lt $deadline)
if (-not $health) { throw "API_HEALTH_FAILED:pid=$($process.Id);stderr=$(Get-Content $stderr -Raw -ErrorAction SilentlyContinue)" }
$status = Invoke-RestMethod 'http://127.0.0.1:8766/api/provider-status' -TimeoutSec 5
if ($status.dispatch_enabled -ne $false -or $status.dispatch_block_reason -ne 'CODEX_APP_LIVE_APPROVAL_REQUIRED') { throw 'CODEX_DISPATCH_NOT_BLOCKED' }
$e2e = @($status.states) | Where-Object { $_.state_key -eq 'APP_CODEX_E2E_LIVE_VERIFIED' }
if (-not $e2e -or $e2e.status -ne 'NOT_VERIFIED') { throw 'CODEX_APP_E2E_STATUS_NOT_HONEST' }
$after = (& $node $dbScript $dbPath | ConvertFrom-Json)
if ($LASTEXITCODE -ne 0 -or $after.integrity -ne 'ok' -or $after.tasks -ne 118 -or $after.active -ne 0 -or $after.codex -ne 0 -or -not $after.guard) { throw 'DATABASE_POST_START_CHECK_FAILED' }
$cim = Get-CimInstance Win32_Process -Filter "ProcessId=$($process.Id)"
$listener = @(Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 8766 -State Listen)
if (-not $cim -or $cim.ExecutablePath -ne $node -or $cim.CommandLine -notmatch [regex]::Escape($entry) -or $listener.Count -ne 1 -or $listener[0].OwningProcess -ne $process.Id) { throw 'RECOVERED_API_PROCESS_IDENTITY_MISMATCH' }
[pscustomobject]@{ result='PASS'; pid=$process.Id; command=$cim.CommandLine; listener='127.0.0.1:8766'; health=$health; provider_status=$status; database=$after; stdout_log=$stdout; stderr_log=$stderr; live_codex_calls=0; paid_api_calls=0; n8n_runs=0 } | ConvertTo-Json -Depth 7
