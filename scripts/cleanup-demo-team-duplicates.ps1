$ErrorActionPreference = "Stop"

$BaseUrl = "http://localhost:8080/api"
$JwtSecret = "5367566B59703373367639792F423F4528482B4D6251655468576D5A71347437"
$DemoTeamNames = @(
  "CSE Support Team",
  "Development Team",
  "QA Testing Team",
  "Deployment Team"
)

function ConvertTo-Base64Url {
  param([byte[]]$Bytes)
  return [Convert]::ToBase64String($Bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

function New-JwtToken {
  param([Parameter(Mandatory = $true)][string]$Subject)

  $now = [DateTimeOffset]::UtcNow
  $headerJson = @{ alg = "HS256"; typ = "JWT" } | ConvertTo-Json -Compress
  $payloadJson = @{
    sub = $Subject
    iat = [int64]$now.ToUnixTimeSeconds()
    exp = [int64]$now.AddHours(12).ToUnixTimeSeconds()
  } | ConvertTo-Json -Compress

  $header = ConvertTo-Base64Url ([Text.Encoding]::UTF8.GetBytes($headerJson))
  $payload = ConvertTo-Base64Url ([Text.Encoding]::UTF8.GetBytes($payloadJson))
  $unsigned = "$header.$payload"
  $key = [Convert]::FromBase64String($JwtSecret)
  $hmac = [System.Security.Cryptography.HMACSHA256]::new($key)
  $signature = ConvertTo-Base64Url ($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($unsigned)))
  return "$unsigned.$signature"
}

function Invoke-Api {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [hashtable]$Headers
  )

  return Invoke-RestMethod -Uri "$BaseUrl$Path" -Method $Method -Headers $Headers -TimeoutSec 30
}

$headers = @{ Authorization = "Bearer $(New-JwtToken -Subject 'admin@ticketportal.com')" }
$teams = (Invoke-Api -Method Get -Path "/teams" -Headers $headers).data

$deleted = @()
foreach ($name in $DemoTeamNames) {
  $matches = @($teams | Where-Object { $_.name -eq $name } | Sort-Object id)
  if ($matches.Count -le 1) { continue }

  $keep = $matches[0]
  $extras = $matches | Select-Object -Skip 1
  foreach ($team in $extras) {
    [void](Invoke-Api -Method Delete -Path "/teams/$($team.id)" -Headers $headers)
    $deleted += "$($team.name) #$($team.id)"
  }
  Write-Host "Kept $($keep.name) #$($keep.id); deleted $($extras.Count) duplicate(s)."
}

$remaining = (Invoke-Api -Method Get -Path "/teams" -Headers $headers).data
Write-Host ""
Write-Host "Deleted duplicates:"
if ($deleted.Count -eq 0) {
  Write-Host "None"
} else {
  $deleted | ForEach-Object { Write-Host "- $_" }
}
Write-Host ""
Write-Host "Remaining teams:"
$remaining | Sort-Object name,id | ForEach-Object {
  Write-Host "- $($_.id): $($_.name) ($($_.memberCount) members)"
}
