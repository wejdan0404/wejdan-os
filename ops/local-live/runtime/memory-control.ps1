param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('list','propose','approve','reject','delete','audit')]
  [string]$Action,
  [string]$ScopeKind = 'agent',
  [string]$RoleId,
  [string]$Status,
  [string]$RecordId,
  [string]$ProposalPath,
  [string]$Note = ''
)

$ErrorActionPreference = 'Stop'
$apiUrl = 'http://127.0.0.1:8766'
$tokenPath = Join-Path $PSScriptRoot '../private/api-control.dpapi'
if (-not (Test-Path -LiteralPath $tokenPath)) { throw 'LOCAL_OWNER_CONTROL_TOKEN_NOT_CONFIGURED' }
$protected = Get-Content -LiteralPath $tokenPath -Raw
$secure = ConvertTo-SecureString -String $protected
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
$headers = @{ 'x-wejdan-local-control' = $token }

switch ($Action) {
  'list' {
    if ($ScopeKind -eq 'agent' -and -not $RoleId) { throw 'ROLE_ID_REQUIRED_FOR_AGENT_MEMORY' }
    $query = "scope_kind=$ScopeKind"
    if ($RoleId) { $query += "&role_id=$([uri]::EscapeDataString($RoleId))" }
    if ($Status) { $query += "&status=$([uri]::EscapeDataString($Status))" }
    Invoke-RestMethod "$apiUrl/api/memory?$query" -Headers $headers -TimeoutSec 10 | ConvertTo-Json -Depth 12
  }
  'propose' {
    if (-not $ProposalPath -or -not (Test-Path -LiteralPath $ProposalPath)) { throw 'PROPOSAL_JSON_PATH_REQUIRED' }
    $payload = Get-Content -LiteralPath $ProposalPath -Raw
    Invoke-RestMethod "$apiUrl/api/memory/proposals" -Method Post -Headers $headers -ContentType 'application/json' -Body $payload -TimeoutSec 10 | ConvertTo-Json -Depth 12
  }
  'approve' { if (-not $RecordId) { throw 'MEMORY_RECORD_ID_REQUIRED' }; Invoke-RestMethod "$apiUrl/api/memory/$RecordId/review" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{decision='approved';note=$Note}|ConvertTo-Json -Compress) -TimeoutSec 10 | ConvertTo-Json -Depth 12 }
  'reject' { if (-not $RecordId) { throw 'MEMORY_RECORD_ID_REQUIRED' }; Invoke-RestMethod "$apiUrl/api/memory/$RecordId/review" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{decision='rejected';note=$Note}|ConvertTo-Json -Compress) -TimeoutSec 10 | ConvertTo-Json -Depth 12 }
  'delete' {
    if (-not $RecordId) { throw 'MEMORY_RECORD_ID_REQUIRED' }
    $confirmation = Read-Host "Delete memory record $RecordId? Type the exact record ID to confirm"
    if ($confirmation -cne $RecordId) { throw 'MEMORY_DELETE_CONFIRMATION_MISMATCH' }
    Invoke-RestMethod "$apiUrl/api/memory/$RecordId" -Method Delete -Headers $headers -ContentType 'application/json' -Body (@{confirm_record_id=$RecordId}|ConvertTo-Json -Compress) -TimeoutSec 10 | ConvertTo-Json -Depth 8
  }
  'audit' { if (-not $RecordId) { throw 'MEMORY_RECORD_ID_REQUIRED' }; Invoke-RestMethod "$apiUrl/api/memory/$RecordId/audit" -Headers $headers -TimeoutSec 10 | ConvertTo-Json -Depth 12 }
}
