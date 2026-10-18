@echo off
title OrgPro PC - Iniciando...
cd /d "%~dp0"
if exist "release\OrgPro PC-win32-x64\OrgPro PC.exe" (
    start "" "release\OrgPro PC-win32-x64\OrgPro PC.exe"
) else (
    npm run build:exe
    start "" "release\OrgPro PC-win32-x64\OrgPro PC.exe"
)
exit
