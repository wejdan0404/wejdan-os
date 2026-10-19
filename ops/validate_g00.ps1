$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $PSScriptRoot 'G00_BACKUP_MANIFEST.json'
$registryPath = Join-Path $PSScriptRoot 'WORKFLOW_REGISTRY.json'
$manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
$registry = Get-Content -Raw $registryPath | ConvertFrom-Json
$failures = [System.Collections.Generic.List[string]]::new()
$passed = 0
function Assert-G00([bool]$condition, [string]$message) {
    if (-not $condition) { $script:failures.Add($message) }
    else { $script:passed++ }
}

Assert-G00 ($manifest.count -eq 7) 'Backup manifest must account for seven live workflows.'
Assert-G00 ($registry.workflow_count -eq $registry.workflows.Count) 'Cloud registry workflow_count must match its current workflow entries.'
Assert-G00 ((Test-Path (Join-Path $root 'ops/GATE_QUEUE.json'))) 'Gate queue missing.'
$queue = Get-Content -Raw (Join-Path $root 'ops/GATE_QUEUE.json') | ConvertFrom-Json
$g00 = @($queue.gates | Where-Object gate_id -eq 'G00')
Assert-G00 ($g00.Count -eq 1 -and $g00[0].status -eq 'VERIFIED_COMPLETE') 'G00 must remain verified complete in the sequential gate ledger.'
$activeGates = @($queue.gates | Where-Object status -eq 'IN_PROGRESS')
Assert-G00 ($activeGates.Count -le 1 -and $queue.current_gate -in @($queue.gates.gate_id)) 'Gate queue has one current gate and no parallel in-progress gates.'

foreach ($entry in $manifest.files) {
    $path = Join-Path $root $entry.export_file
    Assert-G00 (Test-Path $path) "Missing backup: $($entry.export_file)"
    if (-not (Test-Path $path)) { continue }
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
    $json = Get-Content -Raw -LiteralPath $path | ConvertFrom-Json
    Assert-G00 ($hash -eq $entry.sha256.ToLowerInvariant()) "SHA-256 mismatch: $($entry.export_file)"
    Assert-G00 ($json.id -eq $entry.workflow_id) "Workflow ID mismatch: $($entry.export_file)"
    Assert-G00 ($json.active -eq $false -and $entry.active -eq $false) "Unexpected active workflow state: $($entry.workflow_id)"
    $credentialNodes = @($json.nodes | Where-Object { $_.credentials }).Count
    Assert-G00 ($credentialNodes -eq 0 -and $entry.credential_nodes -eq 0) "Unexpected credential-bearing node: $($entry.workflow_id)"
    $registered = @($registry.workflows | Where-Object workflow_id -eq $entry.workflow_id)
    Assert-G00 ($registered.Count -eq 1 -and $registered[0].sha256.ToLowerInvariant() -eq $hash) "Registry export record mismatch: $($entry.workflow_id)"
}

$roleRegistry = Get-Content -Raw (Join-Path $root 'roles/role_registry.json') | ConvertFrom-Json
Assert-G00 ($roleRegistry.role_count -eq 85 -and $roleRegistry.roles.Count -eq 85) 'Role registry count is not 85.'
$notActive = @($roleRegistry.roles | Where-Object runtime_state -ne 'NOT_ACTIVE').Count
Assert-G00 ($notActive -eq 0) 'A role is marked active in the role registry.'
foreach ($required in @('ops/CURRENT_STATE.md','ops/WORK_QUEUE.json','ops/EVIDENCE_MANIFEST.json','ops/DEPENDENCY_GRAPH.md','ops/G00_GAP_AUDIT.md','ops/G00_RESTORE.md','ops/LOCAL_INVENTORY.md','ops/WORKFLOW_REGISTRY.json')) {
    Assert-G00 (Test-Path (Join-Path $root $required)) "Required G00 artifact missing: $required"
}

if ($failures.Count) {
    Write-Output "G00 validation: FAIL ($passed passed, $($failures.Count) failed)"
    $failures | ForEach-Object { Write-Output "FAIL: $_" }
    exit 1
}
Write-Output "G00 local evidence validation: PASS ($passed assertions)."
Write-Output 'This checks local artifacts only; cloud facts are separately evidenced in the workflow registry.'

