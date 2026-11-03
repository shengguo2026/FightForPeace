@echo off
rem Fight For Peace - portable start script (Windows).
rem Uses runtime\node if present, else Node.js 24+ on this PC, else downloads a portable
rem Node.js into runtime\ once. Then starts the local game server and opens the browser.
setlocal EnableExtensions
cd /d "%~dp0"
title Fight For Peace
set "NODE_EXE="
if exist "%~dp0runtime\node\node.exe" set "NODE_EXE=%~dp0runtime\node\node.exe"
if defined NODE_EXE goto run

where node >nul 2>nul
if errorlevel 1 goto download
set "NODE_MAJOR="
for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node" 2^>nul') do set "NODE_MAJOR=%%v"
if not defined NODE_MAJOR goto download
if %NODE_MAJOR% GEQ 24 (
  set "NODE_EXE=node"
  goto run
)

:download
echo Node.js 24 or newer was not found on this PC.
echo Downloading a portable copy into this game folder (about 30 MB, only the first time)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server\get-node.ps1" -Root "%~dp0."
if errorlevel 1 (
  echo.
  echo Could not download Node.js. Check the internet connection and start again,
  echo or install Node.js 24 from https://nodejs.org
  pause
  exit /b 1
)
set "NODE_EXE=%~dp0runtime\node\node.exe"

:run
"%NODE_EXE%" "%~dp0server\server.mjs" %*
if errorlevel 1 pause
