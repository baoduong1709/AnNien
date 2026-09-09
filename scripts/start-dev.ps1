# ==============================================================================
# AnNien Local Development Launcher
# ==============================================================================
# Run this script to start the Backend Gateway and Client simultaneously.

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " AnNien - Trợ lý đàm thoại đồng hành cho người cao tuổi " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$backendDir = Join-Path $PSScriptRoot "..\backend"
$clientDir = Join-Path $PSScriptRoot "..\client"

# 1. Start Backend Gateway
Write-Host "`n[1/2] Starting Backend Proxy Gateway on http://localhost:8080..." -ForegroundColor Green
$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload" -PassThru

Start-Sleep -Seconds 2

# 2. Start Client Frontend
Write-Host "[2/2] Starting Tauri Client Frontend on http://localhost:1420..." -ForegroundColor Green
$clientProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$clientDir'; pnpm run dev" -PassThru

Write-Host "`nServices started!" -ForegroundColor Cyan
Write-Host "- Backend Gateway: http://localhost:8080" -ForegroundColor White
Write-Host "- WebSocket Live:  ws://localhost:8080/ws/live" -ForegroundColor White
Write-Host "- Client Web UI:   http://localhost:1420" -ForegroundColor White
Write-Host "`nTo build native Desktop App: cd client; pnpm run tauri build" -ForegroundColor Yellow
