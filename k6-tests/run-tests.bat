@echo off
REM KernLogic k6 Performance Test Runner
REM Usage: run-tests.bat [test-type] [environment]

setlocal

REM Default values
set TEST_TYPE=%1
set ENVIRONMENT=%2

if "%TEST_TYPE%"=="" set TEST_TYPE=smoke
if "%ENVIRONMENT%"=="" set ENVIRONMENT=local

echo.
echo ========================================
echo  KernLogic k6 Performance Test Runner
echo ========================================
echo.
echo Test Type: %TEST_TYPE%
echo Environment: %ENVIRONMENT%
echo.

REM Check if k6 is installed
k6 version >nul 2>&1
if errorlevel 1 (
    echo ERROR: k6 is not installed or not in PATH
    echo Please install k6 from https://k6.io/docs/getting-started/installation/
    exit /b 1
)

REM Set environment variables based on environment
if "%ENVIRONMENT%"=="local" (
    set BASE_URL=http://localhost:8000
    set TEST_EMAIL=test@example.com
    set TEST_PASSWORD=testpassword123
) else if "%ENVIRONMENT%"=="dev" (
    set BASE_URL=https://dev-api.kernlogic.com
    set TEST_EMAIL=dev-test@kernlogic.com
    set TEST_PASSWORD=%DEV_TEST_PASSWORD%
) else if "%ENVIRONMENT%"=="staging" (
    set BASE_URL=https://staging-api.kernlogic.com
    set TEST_EMAIL=staging-test@kernlogic.com
    set TEST_PASSWORD=%STAGING_TEST_PASSWORD%
) else (
    echo ERROR: Unknown environment: %ENVIRONMENT%
    echo Available environments: local, dev, staging
    exit /b 1
)

echo Using BASE_URL: %BASE_URL%
echo Using TEST_EMAIL: %TEST_EMAIL%
echo.

REM Run the appropriate test
if "%TEST_TYPE%"=="smoke" (
    echo Running smoke test...
    k6 run scripts/smoke-test.js
) else if "%TEST_TYPE%"=="performance" (
    echo Running full performance test...
    k6 run kernlogic-performance.js
) else if "%TEST_TYPE%"=="products" (
    echo Running product-focused load test...
    k6 run scripts/product-load-test.js
) else if "%TEST_TYPE%"=="light" (
    echo Running light load test...
    k6 run --vus 5 --duration 1m kernlogic-performance.js
) else if "%TEST_TYPE%"=="stress" (
    echo Running stress test...
    k6 run --vus 25 --duration 5m kernlogic-performance.js
) else (
    echo ERROR: Unknown test type: %TEST_TYPE%
    echo.
    echo Available test types:
    echo   smoke      - Quick connectivity and basic functionality test
    echo   performance - Full performance test with multiple scenarios
    echo   products   - Product-focused load test
    echo   light      - Light load test (5 users, 1 minute)
    echo   stress     - Stress test (25 users, 5 minutes)
    echo.
    echo Usage: run-tests.bat [test-type] [environment]
    echo Example: run-tests.bat smoke local
    echo Example: run-tests.bat performance staging
    exit /b 1
)

echo.
echo Test completed!
echo. 