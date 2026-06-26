@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "LOCAL_NODE=%~dp0.local\nodejs"
if exist "%LOCAL_NODE%\node.exe" set "PATH=%LOCAL_NODE%;%PATH%"

where node >nul 2>nul || (
  echo Node.js not found. Downloading portable Node.js LTS...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $nodeRoot=Join-Path (Get-Location) '.local\nodejs'; New-Item -ItemType Directory -Force -Path '.local' | Out-Null; $index=Invoke-RestMethod 'https://nodejs.org/dist/index.json'; $version=($index | Where-Object { $_.lts } | Select-Object -First 1).version; $zip='node-' + $version + '-win-x64.zip'; $url='https://nodejs.org/dist/' + $version + '/' + $zip; $tmp=Join-Path $env:TEMP $zip; $extract=Join-Path $env:TEMP ('node-' + $version + '-win-x64'); Invoke-WebRequest -UseBasicParsing $url -OutFile $tmp; if(Test-Path $extract){Remove-Item $extract -Recurse -Force}; Expand-Archive $tmp $env:TEMP -Force; if(Test-Path $nodeRoot){Remove-Item $nodeRoot -Recurse -Force}; Move-Item $extract $nodeRoot" || goto fail
  set "PATH=%LOCAL_NODE%;%PATH%"
)

where npm >nul 2>nul || (
  echo [ERROR] npm not found.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install || goto fail
)

powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5178/' -TimeoutSec 1; if ($r.StatusCode -ge 200) { exit 0 } } catch { exit 1 }"
if "%ERRORLEVEL%"=="0" (
  echo Server is already running.
  start "" "http://127.0.0.1:5178/"
  exit /b 0
)

echo Starting dev server...
start "InformationLookup" cmd /k "cd /d ""%~dp0"" && set ""PATH=%LOCAL_NODE%;%PATH%"" && npm run dev -- --host 127.0.0.1 --port 5178 --strictPort"
powershell -NoProfile -Command "Start-Sleep -Seconds 3"
start "" "http://127.0.0.1:5178/"
exit /b 0

:fail
echo.
echo [ERROR] Startup failed.
pause
exit /b 1
