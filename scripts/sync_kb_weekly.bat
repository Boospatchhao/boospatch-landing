@echo off
REM ============================================================
REM KB 데이터허브 주간 sync — Windows Task Scheduler 등록용
REM 매주 토요일 오전 6시 실행 (KB는 금요일 정오 발표)
REM 로그: data/kb/sync.log
REM ============================================================
setlocal

set PROJ=%~dp0..
cd /d "%PROJ%"

set PATH=C:\Program Files\nodejs;%PATH%
set LOG=%PROJ%\data\kb\sync.log

echo. >> "%LOG%"
echo ====================================================== >> "%LOG%"
echo [%date% %time%] sync 시작 >> "%LOG%"
echo ====================================================== >> "%LOG%"

node "%PROJ%\scripts\sync_kb_api.mjs" >> "%LOG%" 2>&1
set RC=%ERRORLEVEL%

echo [%date% %time%] sync 종료 (exit=%RC%) >> "%LOG%"

endlocal & exit /b %RC%
