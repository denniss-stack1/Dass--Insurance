@echo off
title DASS Insurance System
echo ===================================================
echo   DASS Insurance - Local Launch Control
echo ===================================================
echo.
echo [1/2] Opening client web portal in browser...
start "" "%~dp0frontend\index.html"
echo.
echo [2/2] Bootstrapping local API database server...
echo.
python "%~dp0backend\server.py"
pause
