@echo off
setlocal
cd /d "%~dp0"
title Judicial Fees System

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-system.ps1"
if errorlevel 1 (
  echo.
  echo The system could not be started.
  echo Review: %~dp0.codex-run\server-error.log
  pause
  exit /b 1
)

exit /b 0
