# ============================================================
# KB 주간 sync — Windows Task Scheduler 등록 스크립트
#
# 실행 (관리자 권한 PowerShell 권장):
#   .\scripts\register_kb_sync.ps1
#
# 일정: 매주 토요일 06:00 (KB는 금요일 정오 발표 → 다음날 06시 안전)
# 작업명: BoospatchKBSync
# ============================================================

$TaskName = "BoospatchKBSync"
$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path
$BatPath = Join-Path $ProjectRoot "scripts\sync_kb_weekly.bat"

if (-not (Test-Path $BatPath)) {
    Write-Error "sync_kb_weekly.bat 을 찾을 수 없습니다: $BatPath"
    exit 1
}

# 기존 작업 제거
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "기존 작업 제거: $TaskName"
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$Action  = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"$BatPath`"" `
    -WorkingDirectory $ProjectRoot

$Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Saturday -At "06:00"

$Settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -DontStopOnIdleEnd `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 10) `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "KB 데이터허브 주간 지수 자동 sync (boospatch-landing)" `
    -RunLevel Limited

Write-Host ""
Write-Host "✓ 작업 등록 완료: $TaskName"
Write-Host "  스케줄: 매주 토요일 06:00"
Write-Host "  배치:   $BatPath"
Write-Host "  로그:   $ProjectRoot\data\kb\sync.log"
Write-Host ""
Write-Host "수동 실행 테스트:  Start-ScheduledTask -TaskName $TaskName"
Write-Host "작업 제거:         Unregister-ScheduledTask -TaskName $TaskName -Confirm:`$false"
