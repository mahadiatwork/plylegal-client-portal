# PowerShell script to test Zoho CRM Chat API
# Usage: .\test-zoho-api.ps1 -Email "user@example.com" -ApiKey "your-api-key"

param(
    [Parameter(Mandatory=$true)]
    [string]$Email,
    
    [Parameter(Mandatory=$false)]
    [string]$ApiKey = $env:ZOHO_API_KEY,
    
    [Parameter(Mandatory=$false)]
    [string]$ApiBase = "http://localhost:5000"
)

if (-not $ApiKey) {
    Write-Host "❌ Error: ZOHO_API_KEY not set. Please provide -ApiKey parameter or set environment variable." -ForegroundColor Red
    exit 1
}

$headers = @{
    "Content-Type" = "application/json"
    "x-zoho-api-key" = $ApiKey
}

Write-Host "🧪 Testing Zoho CRM Chat API" -ForegroundColor Cyan
Write-Host "=" * 50
Write-Host "API Base: $ApiBase"
Write-Host "Email: $Email"
Write-Host ""

# Test 1: Search User
Write-Host "📧 Test 1: Search User by Email" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$ApiBase/api/zoho/search-user?email=$([System.Web.HttpUtility]::UrlEncode($Email))" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop
    
    if ($response.success) {
        Write-Host "✅ Success!" -ForegroundColor Green
        Write-Host "   UID: $($response.user.uid)"
        Write-Host "   Email: $($response.user.email)"
        Write-Host "   Name: $($response.user.displayName)"
        $userId = $response.user.uid
    } else {
        Write-Host "❌ Failed: $($response.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit 1
}

Write-Host ""

# Test 2: Fetch Messages
Write-Host "💬 Test 2: Fetch Messages" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$ApiBase/api/zoho/messages?userId=$userId&limit=10" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop
    
    if ($response.success) {
        Write-Host "✅ Success!" -ForegroundColor Green
        Write-Host "   Found $($response.messages.Count) messages"
        if ($response.messages.Count -gt 0) {
            Write-Host "   Latest messages:"
            $response.messages[-3..-1] | ForEach-Object {
                $body = $_.body
                if ($body.Length -gt 50) { $body = $body.Substring(0, 50) + "..." }
                Write-Host "   - [$($_.senderType)] $($_.senderName): $body"
            }
            $messageIds = $response.messages | ForEach-Object { $_.id }
        } else {
            $messageIds = @()
        }
    } else {
        Write-Host "❌ Failed: $($response.error)" -ForegroundColor Red
        $messageIds = @()
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    $messageIds = @()
}

Write-Host ""

# Test 3: Send Message
Write-Host "📤 Test 3: Send Agent Message" -ForegroundColor Yellow
try {
    $messageData = @{
        userId = $userId
        senderType = "agent"
        senderUid = "zoho-agent-test-$(Get-Date -Format 'yyyyMMddHHmmss')"
        senderName = "Test Agent"
        body = "Test message from PowerShell API tester at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$ApiBase/api/zoho/messages" `
        -Method Post `
        -Headers $headers `
        -Body $messageData `
        -ErrorAction Stop
    
    if ($response.success) {
        Write-Host "✅ Success!" -ForegroundColor Green
        Write-Host "   Message ID: $($response.message.id)"
        Write-Host "   Message: $($response.message.body.Substring(0, [Math]::Min(50, $response.message.body.Length)))..."
        $messageIds += $response.message.id
    } else {
        Write-Host "❌ Failed: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 4: Mark Messages as Seen
if ($messageIds.Count -gt 0) {
    Write-Host "👁️  Test 4: Mark Messages as Seen" -ForegroundColor Yellow
    try {
        $updateData = @{
            messageIds = $messageIds[0..([Math]::Min(4, $messageIds.Count - 1))]
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$ApiBase/api/zoho/messages" `
            -Method Patch `
            -Headers $headers `
            -Body $updateData `
            -ErrorAction Stop
        
        if ($response.success) {
            Write-Host "✅ Success!" -ForegroundColor Green
            Write-Host "   Updated $($response.updated) messages"
        } else {
            Write-Host "❌ Failed: $($response.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "👁️  Test 4: Mark Messages as Seen (skipped - no messages)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=" * 50
Write-Host "✅ All tests completed!" -ForegroundColor Green

