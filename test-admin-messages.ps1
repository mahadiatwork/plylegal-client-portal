# PowerShell test script for Admin Messages API
# Usage: .\test-admin-messages.ps1 -Email "user@example.com" -AdminKey "your-key"

param(
    [Parameter(Mandatory=$true)]
    [string]$Email,
    
    [Parameter(Mandatory=$false)]
    [string]$AdminKey = $env:PORTAL_ADMIN_KEY,
    
    [Parameter(Mandatory=$false)]
    [string]$ApiBase = "http://localhost:5000"
)

if (-not $AdminKey) {
    Write-Host "❌ Error: PORTAL_ADMIN_KEY not set. Please provide -AdminKey parameter or set environment variable." -ForegroundColor Red
    exit 1
}

$headers = @{
    "Content-Type" = "application/json"
    "x-admin-key" = $AdminKey
}

Write-Host "🧪 Testing Admin Messages API" -ForegroundColor Cyan
Write-Host "=" * 50
Write-Host "API Base: $ApiBase"
Write-Host "Email: $Email"
Write-Host ""

# Test 1: 401 Missing Key
Write-Host "🧪 Test 1: 401 when key is missing" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$ApiBase/api/admin/messages?email=$([System.Web.HttpUtility]::UrlEncode($Email))" `
        -Method Get `
        -Headers @{ "Content-Type" = "application/json" } `
        -ErrorAction Stop
    
    Write-Host "❌ Test failed: Expected 401, but got success response" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "✅ Test passed: 401 returned when key is missing" -ForegroundColor Green
    } else {
        Write-Host "❌ Test failed: Expected 401, got $statusCode" -ForegroundColor Red
    }
}

Write-Host ""

# Test 2: 401 Wrong Key
Write-Host "🧪 Test 2: 401 when key is wrong" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$ApiBase/api/admin/messages?email=$([System.Web.HttpUtility]::UrlEncode($Email))" `
        -Method Get `
        -Headers @{ 
            "Content-Type" = "application/json"
            "x-admin-key" = "wrong-key-12345"
        } `
        -ErrorAction Stop
    
    Write-Host "❌ Test failed: Expected 401, but got success response" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "✅ Test passed: 401 returned when key is wrong" -ForegroundColor Green
    } else {
        Write-Host "❌ Test failed: Expected 401, got $statusCode" -ForegroundColor Red
    }
}

Write-Host ""

# Test 3: 400 Missing Email
Write-Host "🧪 Test 3: 400 when email is missing" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$ApiBase/api/admin/messages" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Host "❌ Test failed: Expected 400, but got success response" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "✅ Test passed: 400 returned when email is missing" -ForegroundColor Green
    } else {
        Write-Host "❌ Test failed: Expected 400, got $statusCode" -ForegroundColor Red
    }
}

Write-Host ""

# Test 4: 200 Valid Request
Write-Host "🧪 Test 4: 200 with valid request" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$ApiBase/api/admin/messages?email=$([System.Web.HttpUtility]::UrlEncode($Email))&limit=10" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop
    
    if ($response.success) {
        Write-Host "✅ Test passed: 200 returned with messages" -ForegroundColor Green
        Write-Host "   Found $($response.messages.Count) messages"
        Write-Host "   Has more: $($response.hasMore)"
        if ($response.messages.Count -gt 0) {
            $firstMsg = $response.messages[0]
            Write-Host "   Sample message:"
            Write-Host "     ID: $($firstMsg.id)"
            Write-Host "     Sender: $($firstMsg.senderName) ($($firstMsg.senderType))"
            Write-Host "     Body: $($firstMsg.body.Substring(0, [Math]::Min(50, $firstMsg.body.Length)))..."
        }
    } else {
        Write-Host "❌ Test failed: Response indicates failure" -ForegroundColor Red
        Write-Host "   Response: $($response | ConvertTo-Json -Depth 3)"
    }
} catch {
    Write-Host "❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=" * 50
Write-Host "✅ All tests completed!" -ForegroundColor Green

