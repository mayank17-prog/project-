@echo off
setlocal
pushd "%~dp0"

echo ============================================================
echo   Starting Smart Search Frontend on http://localhost:5173
echo ============================================================
echo.

node ./node_modules/vite/bin/vite.js

popd
pause
