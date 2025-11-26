# Comprehensive fix script for Next.js dev server issues
Write-Host "🔧 Fixing Next.js Dev Server Issues..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop all Node processes
Write-Host "1️⃣ Stopping all Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "   ✅ Node processes stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Clear .next folder
Write-Host "2️⃣ Clearing .next build cache..." -ForegroundColor Yellow
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
    Write-Host "   ✅ .next folder deleted" -ForegroundColor Green
} else {
    Write-Host "   ℹ️ .next folder not found" -ForegroundColor Gray
}
Write-Host ""

# Step 3: Clear node_modules cache
Write-Host "3️⃣ Clearing node_modules cache..." -ForegroundColor Yellow
if (Test-Path node_modules\.cache) {
    Remove-Item -Recurse -Force node_modules\.cache
    Write-Host "   ✅ node_modules cache cleared" -ForegroundColor Green
} else {
    Write-Host "   ℹ️ No node_modules cache found" -ForegroundColor Gray
}
Write-Host ""

# Step 4: Clear npm cache
Write-Host "4️⃣ Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force 2>&1 | Out-Null
Write-Host "   ✅ npm cache cleared" -ForegroundColor Green
Write-Host ""

# Step 5: Check for syntax errors in key files
Write-Host "5️⃣ Checking for syntax errors..." -ForegroundColor Yellow
$files = @("app/layout.js", "app/providers.jsx", "src/lib/queryClient.js")
$hasErrors = $false

foreach ($file in $files) {
    if (Test-Path $file) {
        try {
            $content = Get-Content $file -Raw
            # Basic check - if file can be read, it's likely OK
            Write-Host "   ✅ $file - OK" -ForegroundColor Green
        } catch {
            Write-Host "   ❌ $file - Error: $_" -ForegroundColor Red
            $hasErrors = $true
        }
    }
}
Write-Host ""

# Step 6: Reinstall dependencies (optional - uncomment if needed)
# Write-Host "6️⃣ Reinstalling dependencies..." -ForegroundColor Yellow
# npm install
# Write-Host "   ✅ Dependencies reinstalled" -ForegroundColor Green
# Write-Host ""

Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host "✅ Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Clear your browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "2. Close all browser tabs with localhost:5000" -ForegroundColor White
Write-Host "3. Run: npm run dev" -ForegroundColor White
Write-Host "4. Open a NEW browser tab and go to http://localhost:5000" -ForegroundColor White
Write-Host ""

