$ErrorActionPreference = "Stop"

$BaseUrl = "http://localhost:8080/api"
$Password = "Admin@123"
$JwtSecret = "5367566B59703373367639792F423F4528482B4D6251655468576D5A71347437"

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
    [object]$Body = $null,
    [hashtable]$Headers = @{}
  )

  $params = @{
    Uri = "$BaseUrl$Path"
    Method = $Method
    Headers = $Headers
    TimeoutSec = 30
  }
  if ($null -ne $Body) {
    $params.ContentType = "application/json"
    $params.Body = ($Body | ConvertTo-Json -Depth 12)
  }
  return Invoke-RestMethod @params
}

function Try-Api {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [object]$Body = $null,
    [hashtable]$Headers = @{}
  )

  try {
    return Invoke-Api -Method $Method -Path $Path -Body $Body -Headers $Headers
  } catch {
    return $null
  }
}

function Add-Comment-IfMissing {
  param(
    [long]$TicketId,
    [string]$Content,
    [hashtable]$Headers
  )

  $existing = (Invoke-Api -Method Get -Path "/tickets/$TicketId/comments" -Headers $Headers).data
  $found = @($existing | Where-Object { $_.content -eq $Content }).Count -gt 0
  if (-not $found) {
    [void](Invoke-Api -Method Post -Path "/tickets/$TicketId/comments" -Body @{ content = $Content } -Headers $Headers)
  }
}

Write-Host "Preparing admin API token..."
$AdminHeaders = @{ Authorization = "Bearer $(New-JwtToken -Subject 'admin@ticketportal.com')" }

$usersToCreate = @(
  @{ username = "amit.client"; email = "amit.client@abcfinance.com"; firstName = "Amit"; lastName = "Sharma"; roles = @("ROLE_MANAGER") },
  @{ username = "priya.cse"; email = "priya.cse@issuehub.com"; firstName = "Priya"; lastName = "Nair"; roles = @("ROLE_MANAGER") },
  @{ username = "rahul.cse"; email = "rahul.cse@issuehub.com"; firstName = "Rahul"; lastName = "Mehta"; roles = @("ROLE_MANAGER") },
  @{ username = "sneha.cse"; email = "sneha.cse@issuehub.com"; firstName = "Sneha"; lastName = "Iyer"; roles = @("ROLE_MANAGER") },
  @{ username = "kavita.csemanager"; email = "kavita.csemanager@issuehub.com"; firstName = "Kavita"; lastName = "Rao"; roles = @("ROLE_MANAGER") },
  @{ username = "vikram.devmanager"; email = "vikram.devmanager@issuehub.com"; firstName = "Vikram"; lastName = "Singh"; roles = @("ROLE_MANAGER") },
  @{ username = "arjun.dev"; email = "arjun.dev@issuehub.com"; firstName = "Arjun"; lastName = "Patel"; roles = @("ROLE_DEVELOPER") },
  @{ username = "meera.dev"; email = "meera.dev@issuehub.com"; firstName = "Meera"; lastName = "Kapoor"; roles = @("ROLE_DEVELOPER") },
  @{ username = "faisal.dev"; email = "faisal.dev@issuehub.com"; firstName = "Faisal"; lastName = "Khan"; roles = @("ROLE_DEVELOPER") },
  @{ username = "neha.tester"; email = "neha.tester@issuehub.com"; firstName = "Neha"; lastName = "Verma"; roles = @("ROLE_TESTER") },
  @{ username = "karan.tester"; email = "karan.tester@issuehub.com"; firstName = "Karan"; lastName = "Malhotra"; roles = @("ROLE_TESTER") },
  @{ username = "divya.tester"; email = "divya.tester@issuehub.com"; firstName = "Divya"; lastName = "Menon"; roles = @("ROLE_TESTER") }
)

Write-Host "Creating/reusing demo users..."
foreach ($u in $usersToCreate) {
  $body = @{
    username = $u.username
    email = $u.email
    password = $Password
    firstName = $u.firstName
    lastName = $u.lastName
    roles = $u.roles
  }
  [void](Try-Api -Method Post -Path "/auth/register" -Body $body)
}

$memberEmails = @(
  "admin@ticketportal.com",
  "john.doe@ticketportal.com",
  "jane.smith@ticketportal.com",
  "bob.tester@ticketportal.com",
  "amit.client@abcfinance.com",
  "priya.cse@issuehub.com",
  "rahul.cse@issuehub.com",
  "sneha.cse@issuehub.com",
  "kavita.csemanager@issuehub.com",
  "vikram.devmanager@issuehub.com",
  "arjun.dev@issuehub.com",
  "meera.dev@issuehub.com",
  "faisal.dev@issuehub.com",
  "neha.tester@issuehub.com",
  "karan.tester@issuehub.com",
  "divya.tester@issuehub.com"
)

$allUsers = (Invoke-Api -Method Get -Path "/users?size=300" -Headers $AdminHeaders).data.content
foreach ($u in $allUsers) {
  $isDemoAccount = $memberEmails -contains $u.email
  if ($isDemoAccount -and -not $u.active) {
    [void](Invoke-Api -Method Patch -Path "/users/$($u.id)/toggle-status" -Headers $AdminHeaders)
  }
}
$allUsers = (Invoke-Api -Method Get -Path "/users?size=300" -Headers $AdminHeaders).data.content
$userByEmail = @{}
foreach ($u in $allUsers) { $userByEmail[$u.email] = $u }

Write-Host "Creating/reusing project..."
$projects = (Invoke-Api -Method Get -Path "/projects?size=200" -Headers $AdminHeaders).data.content
$project = @($projects | Where-Object { $_.keyPrefix -eq "ABC" -or $_.name -eq "ABC Finance - Support & Enhancement" } | Select-Object -First 1)
if (-not $project) {
  $project = (Invoke-Api -Method Post -Path "/projects" -Headers $AdminHeaders -Body @{
    name = "ABC Finance - Support & Enhancement"
    description = "Real-life support workflow for ABC Finance covering requirement intake, development, testing, UAT, live deployment, and ticket closure."
    keyPrefix = "ABC"
  }).data
}

foreach ($email in $memberEmails) {
  if ($userByEmail.ContainsKey($email)) {
    [void](Try-Api -Method Post -Path "/projects/$($project.id)/members/$($userByEmail[$email].id)" -Headers $AdminHeaders)
  }
}

Write-Host "Creating/reusing labels..."
$labelSpecs = @(
  @{ name = "Client Request"; color = "#2563EB" },
  @{ name = "Production Issue"; color = "#DC2626" },
  @{ name = "Enhancement"; color = "#7C3AED" },
  @{ name = "Bug"; color = "#EF4444" },
  @{ name = "Requirement Review"; color = "#0891B2" },
  @{ name = "Dev Planning"; color = "#4F46E5" },
  @{ name = "Backend"; color = "#0F766E" },
  @{ name = "Frontend"; color = "#DB2777" },
  @{ name = "Integration"; color = "#9333EA" },
  @{ name = "Test Failed"; color = "#EA580C" },
  @{ name = "UAT Failed"; color = "#B91C1C" },
  @{ name = "UAT Approved"; color = "#16A34A" },
  @{ name = "Live Ready"; color = "#059669" },
  @{ name = "Production Verified"; color = "#15803D" },
  @{ name = "Testing"; color = "#F59E0B" },
  @{ name = "Documentation"; color = "#10B981" }
)

$labels = (Invoke-Api -Method Get -Path "/projects/$($project.id)/labels" -Headers $AdminHeaders).data
foreach ($spec in $labelSpecs) {
  $label = @($labels | Where-Object { $_.name -eq $spec.name } | Select-Object -First 1)
  if (-not $label) {
    $label = (Invoke-Api -Method Post -Path "/projects/$($project.id)/labels" -Headers $AdminHeaders -Body @{
      name = $spec.name
      color = $spec.color
      projectId = $project.id
    }).data
    $labels += $label
  }
}
$labelByName = @{}
foreach ($l in $labels) { $labelByName[$l.name] = $l }

function Label-Ids {
  param([string[]]$Names)
  $ids = @()
  foreach ($name in $Names) {
    if ($labelByName.ContainsKey($name)) { $ids += [long]$labelByName[$name].id }
  }
  return $ids
}

function Ensure-Ticket {
  param(
    [string]$Title,
    [string]$Description,
    [string]$Type,
    [string]$Priority,
    [string]$Status,
    [string]$ReporterEmail,
    [string]$AssigneeEmail,
    [int]$EstimatedHours,
    [string[]]$Labels,
    [string]$DueDate
  )

  $found = (Invoke-Api -Method Get -Path "/tickets?projectId=$($project.id)&size=100&search=$([uri]::EscapeDataString($Title))" -Headers $AdminHeaders).data.content |
    Where-Object { $_.title -eq $Title } |
    Select-Object -First 1

  if ($found) { return $found }

  $reporterHeaders = @{ Authorization = "Bearer $(New-JwtToken -Subject $ReporterEmail)" }

  $body = @{
    projectId = $project.id
    title = $Title
    description = $Description
    type = $Type
    priority = $Priority
    assigneeId = $userByEmail[$AssigneeEmail].id
    estimatedHours = $EstimatedHours
    labelIds = @(Label-Ids -Names $Labels)
  }
  if ($DueDate) { $body.dueDate = $DueDate }

  $ticket = (Invoke-Api -Method Post -Path "/tickets" -Headers $reporterHeaders -Body $body).data
  $updateBody = @{
    status = $Status
    priority = $Priority
    type = $Type
    assigneeId = $userByEmail[$AssigneeEmail].id
    estimatedHours = $EstimatedHours
    labelIds = @(Label-Ids -Names $Labels)
  }
  if ($DueDate) { $updateBody.dueDate = $DueDate }
  return (Invoke-Api -Method Put -Path "/tickets/$($ticket.id)" -Headers $AdminHeaders -Body $updateBody).data
}

$today = Get-Date
$dueMain = $today.AddDays(7).ToString("yyyy-MM-dd")
$dueShort = $today.AddDays(3).ToString("yyyy-MM-dd")
$dueMedium = $today.AddDays(5).ToString("yyyy-MM-dd")

Write-Host "Creating/reusing tickets..."
$mainTicket = Ensure-Ticket `
  -Title "Add client-wise SLA breach alert on support dashboard" `
  -Description "ABC Finance wants an SLA breach alert on the support dashboard. The alert should show client name, ticket number, pending hours, assigned user, and escalation status. CSE must validate this in UAT before live deployment." `
  -Type "IMPROVEMENT" -Priority "HIGH" -Status "CLOSED" `
  -ReporterEmail "priya.cse@issuehub.com" -AssigneeEmail "arjun.dev@issuehub.com" `
  -EstimatedHours 16 -Labels @("Client Request", "Enhancement", "Backend", "Frontend", "UAT Approved", "Live Ready", "Production Verified") -DueDate $dueMain

$tickets = @()
$tickets += $mainTicket
$tickets += Ensure-Ticket -Title "Payment confirmation email not sent after successful transaction" -Description "ABC Finance reports that successful payments do not always trigger confirmation emails. Needs urgent production fix and regression testing." -Type "BUG" -Priority "CRITICAL" -Status "TODO" -ReporterEmail "rahul.cse@issuehub.com" -AssigneeEmail "arjun.dev@issuehub.com" -EstimatedHours 12 -Labels @("Production Issue", "Bug", "Backend") -DueDate $dueShort
$tickets += Ensure-Ticket -Title "Login page layout breaks on mobile browser" -Description "CSE observed mobile layout overlap on the login screen after the latest release. Needs frontend fix and TEST validation." -Type "BUG" -Priority "HIGH" -Status "IN_PROGRESS" -ReporterEmail "sneha.cse@issuehub.com" -AssigneeEmail "meera.dev@issuehub.com" -EstimatedHours 8 -Labels @("Bug", "Frontend") -DueDate $dueMedium
$tickets += Ensure-Ticket -Title "Add filter by client name in ticket explorer" -Description "Managers need to filter tickets by client name for faster review during weekly support meetings." -Type "IMPROVEMENT" -Priority "MEDIUM" -Status "TODO" -ReporterEmail "kavita.csemanager@issuehub.com" -AssigneeEmail "faisal.dev@issuehub.com" -EstimatedHours 10 -Labels @("Enhancement", "Frontend", "Backend") -DueDate $dueMain
$tickets += Ensure-Ticket -Title "Prepare regression test cases for SLA dashboard" -Description "QA must prepare positive, negative, and boundary test cases for SLA breach alert behavior." -Type "TEST" -Priority "MEDIUM" -Status "TODO" -ReporterEmail "vikram.devmanager@issuehub.com" -AssigneeEmail "neha.tester@issuehub.com" -EstimatedHours 6 -Labels @("Testing") -DueDate $dueMedium
$tickets += Ensure-Ticket -Title "Update UAT checklist for production release" -Description "Add SLA alert validation and production sign-off checklist for CSE UAT." -Type "DOCUMENTATION" -Priority "LOW" -Status "DONE" -ReporterEmail "priya.cse@issuehub.com" -AssigneeEmail "divya.tester@issuehub.com" -EstimatedHours 4 -Labels @("Documentation", "UAT Approved") -DueDate $dueMedium
$tickets += Ensure-Ticket -Title "API timeout while fetching old transaction history" -Description "Transaction history API times out for large ABC Finance accounts. Needs integration optimization and TEST verification." -Type "BUG" -Priority "HIGH" -Status "TESTING" -ReporterEmail "rahul.cse@issuehub.com" -AssigneeEmail "faisal.dev@issuehub.com" -EstimatedHours 14 -Labels @("Production Issue", "Bug", "Integration", "Backend", "Testing") -DueDate $dueShort
$tickets += Ensure-Ticket -Title "Add escalation comment template for CSE users" -Description "CSE users need a reusable escalation comment template for quicker communication on client-impacting tickets." -Type "FEATURE" -Priority "MEDIUM" -Status "IN_REVIEW" -ReporterEmail "kavita.csemanager@issuehub.com" -AssigneeEmail "meera.dev@issuehub.com" -EstimatedHours 9 -Labels @("Enhancement", "Frontend") -DueDate $dueMain

Write-Host "Creating/reusing sprint and adding tickets..."
$sprints = (Invoke-Api -Method Get -Path "/sprints/project/$($project.id)" -Headers $AdminHeaders).data
$sprint = @($sprints | Where-Object { $_.name -eq "Sprint 1 - ABC Finance SLA Release" } | Select-Object -First 1)
if (-not $sprint) {
  $sprint = (Invoke-Api -Method Post -Path "/sprints/project/$($project.id)" -Headers $AdminHeaders -Body @{
    name = "Sprint 1 - ABC Finance SLA Release"
    goal = "Deliver SLA alert, payment issue fix, and UAT-ready support improvements."
    startDate = $today.ToString("yyyy-MM-dd")
    endDate = $today.AddDays(7).ToString("yyyy-MM-dd")
  }).data
}
foreach ($ticket in $tickets) {
  [void](Try-Api -Method Post -Path "/sprints/$($sprint.id)/tickets/$($ticket.id)" -Headers $AdminHeaders)
}
if ($sprint.status -eq "PLANNING") {
  $sprint = (Invoke-Api -Method Patch -Path "/sprints/$($sprint.id)/start" -Headers $AdminHeaders).data
}

Write-Host "Creating/reusing teams..."
$teamSpecs = @(
  @{ name = "CSE Support Team"; description = "CSE executives and CSE manager handling client intake and UAT."; lead = "kavita.csemanager@issuehub.com"; members = @("priya.cse@issuehub.com", "rahul.cse@issuehub.com", "sneha.cse@issuehub.com", "kavita.csemanager@issuehub.com") },
  @{ name = "Development Team"; description = "Development manager and developers implementing fixes and enhancements."; lead = "vikram.devmanager@issuehub.com"; members = @("vikram.devmanager@issuehub.com", "john.doe@ticketportal.com", "arjun.dev@issuehub.com", "meera.dev@issuehub.com", "faisal.dev@issuehub.com") },
  @{ name = "QA Testing Team"; description = "Functional, regression, and UAT support testers."; lead = "bob.tester@ticketportal.com"; members = @("bob.tester@ticketportal.com", "neha.tester@issuehub.com", "karan.tester@issuehub.com", "divya.tester@issuehub.com") },
  @{ name = "Deployment Team"; description = "Release coordination for TEST, UAT, and LIVE deployments."; lead = "vikram.devmanager@issuehub.com"; members = @("vikram.devmanager@issuehub.com", "faisal.dev@issuehub.com", "admin@ticketportal.com") }
)

$teams = (Invoke-Api -Method Get -Path "/teams" -Headers $AdminHeaders).data
foreach ($spec in $teamSpecs) {
  $team = @($teams | Where-Object { $_.name -eq $spec.name } | Select-Object -First 1)
  $memberIds = @()
  foreach ($email in $spec.members) {
    if ($userByEmail.ContainsKey($email)) { $memberIds += [long]$userByEmail[$email].id }
  }
  if (-not $team) {
    $team = (Invoke-Api -Method Post -Path "/teams" -Headers $AdminHeaders -Body @{
      name = $spec.name
      description = $spec.description
      projectId = $project.id
      leadId = $userByEmail[$spec.lead].id
      memberIds = $memberIds
    }).data
  } else {
    foreach ($memberId in $memberIds) {
      [void](Try-Api -Method Post -Path "/teams/$($team.id)/members/$memberId" -Headers $AdminHeaders)
    }
  }
}

Write-Host "Adding workflow comments to main ticket..."
$workflowComments = @(
  "Client ABC Finance requested SLA breach alerts on the support dashboard.",
  "CSE requirement review completed. Need development manager confirmation for effort and sprint planning.",
  "Development manager reviewed the requirement. Assigned to development team for Sprint 1.",
  "Analysis completed. Work includes SLA calculation, dashboard alert UI, and escalation flag.",
  "Coding completed. Build is ready for TEST deployment.",
  "Deployed to TEST environment for QA validation.",
  "TEST failed: pending hours are calculated incorrectly when weekends are included.",
  "Weekend calculation fixed. Redeployed to TEST.",
  "TEST passed. Functional and regression testing completed successfully.",
  "Deployed to UAT environment for CSE/business validation.",
  "UAT approved by CSE. Alert details are correct and business validation is completed.",
  "Released to LIVE environment.",
  "Final production verification completed. Ticket can be closed."
)
foreach ($comment in $workflowComments) {
  Add-Comment-IfMissing -TicketId $mainTicket.id -Content $comment -Headers $AdminHeaders
}

Write-Host ""
Write-Host "Demo data seed complete."
Write-Host "Project: $($project.name) (ID $($project.id))"
Write-Host "Sprint: $($sprint.name) (ID $($sprint.id), Status $($sprint.status))"
Write-Host "Main ticket: $($mainTicket.ticketNumber) - $($mainTicket.title) (ID $($mainTicket.id))"
Write-Host "Demo password for all custom users: $Password"
