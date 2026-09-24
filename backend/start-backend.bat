@echo off
setlocal
pushd "%~dp0"

echo ============================================================
echo   Starting Smart Search Backend on http://localhost:5000
echo ============================================================
echo.

node server.js

popd
pause
