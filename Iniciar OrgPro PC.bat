@echo off
title OrgPro PC - Iniciando...
<<<<<<< HEAD
cd /d "%~dp0\OrgProPC"
if exist "release\OrgPro PC-win32-x64\OrgPro PC.exe" (
    start "" "release\OrgPro PC-win32-x64\OrgPro PC.exe"
) else (
    call npm run build:exe
=======
cd /d "%~dp0"
if exist "release\OrgPro PC-win32-x64\OrgPro PC.exe" (
    start "" "release\OrgPro PC-win32-x64\OrgPro PC.exe"
) else (
    npm run build:exe
>>>>>>> bc9977a38f26641e5847af7267cab8a6ead1824c
    start "" "release\OrgPro PC-win32-x64\OrgPro PC.exe"
)
exit
