@echo off
title OrgPro PC - Iniciando...
cd /d "%~dp0\OrgProPC"
if exist "release\OrgPro PC-win32-x64\OrgPro PC.exe" (
    start "" "release\OrgPro PC-win32-x64\OrgPro PC.exe"
) else (
    call npm run build:exe
    start "" "release\OrgPro PC-win32-x64\OrgPro PC.exe"
)
exit
