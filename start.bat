@echo off
REM Retail Arbitrage Scraper - Windows Start Script

echo ============================================
echo   Retail Arbitrage Scraper
echo ============================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed.
    echo.
    echo Please install Node.js from https://nodejs.org/
    echo Recommended version: 18.x or higher
    pause
    exit /b 1
)

echo Starting server...
echo.
echo Open your browser to: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

npm start
