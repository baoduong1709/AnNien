$ErrorActionPreference = "Stop"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  BẮT ĐẦU BIÊN DỊCH ANDROID APK ANNIEN    " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$env:ANDROID_HOME = "C:\Users\OS\AppData\Local\Android\Sdk"
$env:NDK_HOME = "C:\Users\OS\AppData\Local\Android\Sdk\ndk\29.0.13846066"

Set-Location "D:\Project\AnNien\client"
pnpm tauri android build --debug --apk --target aarch64

$sourceApk = "D:\Project\AnNien\client\src-tauri\gen\android\app\build\outputs\apk\universal\debug\app-universal-debug.apk"

if (Test-Path $sourceApk) {
    # 1. Copy sang thư mục gốc phục vụ tải qua Backend Gateway
    Copy-Item $sourceApk -Destination "D:\Project\AnNien\AnNien-TroLyNguoiCaoTuoi.apk" -Force
    Write-Host "[OK] Đã cập nhật APK tại thư mục dự án: D:\Project\AnNien\AnNien-TroLyNguoiCaoTuoi.apk" -ForegroundColor Green

    # 2. Tự động chuyển sang D:\Drive theo yêu cầu
    if (Test-Path "D:\Drive") {
        Copy-Item $sourceApk -Destination "D:\Drive\AnNien-TroLyNguoiCaoTuoi.apk" -Force
        Write-Host "[OK] Đã tự động chuyển APK sang: D:\Drive\AnNien-TroLyNguoiCaoTuoi.apk" -ForegroundColor Green
    }

    Write-Host "`nThông tin file hoàn tất:" -ForegroundColor Yellow
    Get-Item "D:\Drive\AnNien-TroLyNguoiCaoTuoi.apk" | Select-Object Name, @{Name="SizeMB";Expression={[math]::Round($_.Length / 1MB, 2)}}, LastWriteTime | Format-Table -AutoSize
} else {
    Write-Error "Lỗi: Không tìm thấy file APK sau khi build!"
}
