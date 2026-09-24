@echo off
setlocal
pushd "%~dp0"

echo ============================================================
echo   Smart Search: Debounce, AbortController ^& Server Cache
echo ============================================================
echo.
echo [1/2] Checking and installing dependencies...
call npm install

echo.
echo [2/2] Starting Full-Stack Server on http://localhost:3000...
echo (Press Ctrl+C to stop)
echo.

node ./node_modules/tsx/dist/cli.mjs server.ts

popd
pause
