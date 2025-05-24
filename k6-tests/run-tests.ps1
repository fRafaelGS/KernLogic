param(
    [Parameter(Position=0)]
    [ValidateSet("smoke", "performance", "products", "light", "stress")]
    [string]$TestType = "smoke",
    
    [Parameter(Position=1)]
    [ValidateSet("local", "dev", "staging", "production")]
    [string]$Environment = "local",
    
    [switch]$Verbose,
    [switch]$Help
)

function Show-Help {
    Write-Host ""
    Write-Host "KernLogic k6 Performance Test Runner" -ForegroundColor Green
    Write-Host "====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usage: ./run-tests.ps1 [TestType] [Environment] [Options]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Test Types:" -ForegroundColor Cyan
    Write-Host "  smoke      - Quick connectivity and basic functionality test"
    Write-Host "  performance - Full performance test with multiple scenarios"  
    Write-Host "  products   - Product-focused load test"
    Write-Host "  light      - Light load test (5 users, 1 minute)"
    Write-Host "  stress     - Stress test (25 users, 5 minutes)"
    Write-Host ""
    Write-Host "Environments:" -ForegroundColor Cyan
    Write-Host "  local      - Local development server (localhost:8000)"
    Write-Host "  dev        - Development environment"
    Write-Host "  staging    - Staging environment" 
    Write-Host "  production - Production environment (use with caution!)"
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "  -Verbose   - Show detailed output"
    Write-Host "  -Help      - Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  ./run-tests.ps1 smoke local"
    Write-Host "  ./run-tests.ps1 performance staging -Verbose"
    Write-Host "  ./run-tests.ps1 products dev"
    Write-Host ""
}

if ($Help) {
    Show-Help
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " KernLogic k6 Performance Test Runner" -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Test Type: $TestType" -ForegroundColor Yellow
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host ""

# Check if k6 is installed
try {
    $k6Version = k6 version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "k6 not found"
    }
    Write-Host "✅ k6 is installed: $($k6Version -split "`n" | Select-Object -First 1)" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: k6 is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install k6 from https://k6.io/docs/getting-started/installation/" -ForegroundColor Yellow
    exit 1
}

# Set environment variables based on environment
switch ($Environment) {
    "local" {
        $env:BASE_URL = "http://localhost:8000"
        $env:TEST_EMAIL = "test@example.com"
        $env:TEST_PASSWORD = "testpassword123"
    }
    "dev" {
        $env:BASE_URL = "https://dev-api.kernlogic.com"
        $env:TEST_EMAIL = "dev-test@kernlogic.com"
        $env:TEST_PASSWORD = $env:DEV_TEST_PASSWORD
        if (-not $env:TEST_PASSWORD) {
            Write-Host "⚠️  WARNING: DEV_TEST_PASSWORD environment variable not set" -ForegroundColor Yellow
        }
    }
    "staging" {
        $env:BASE_URL = "https://staging-api.kernlogic.com"
        $env:TEST_EMAIL = "staging-test@kernlogic.com"
        $env:TEST_PASSWORD = $env:STAGING_TEST_PASSWORD
        if (-not $env:TEST_PASSWORD) {
            Write-Host "⚠️  WARNING: STAGING_TEST_PASSWORD environment variable not set" -ForegroundColor Yellow
        }
    }
    "production" {
        Write-Host "⚠️  WARNING: Running tests against PRODUCTION environment!" -ForegroundColor Red
        Write-Host "Are you sure you want to continue? (y/N): " -NoNewline -ForegroundColor Yellow
        $confirmation = Read-Host
        if ($confirmation -ne "y" -and $confirmation -ne "Y") {
            Write-Host "Test cancelled." -ForegroundColor Yellow
            exit 0
        }
        
        $env:BASE_URL = "https://api.kernlogic.com"
        $env:TEST_EMAIL = "prod-test@kernlogic.com"
        $env:TEST_PASSWORD = $env:PROD_TEST_PASSWORD
        if (-not $env:TEST_PASSWORD) {
            Write-Host "❌ ERROR: PROD_TEST_PASSWORD environment variable is required for production tests" -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host "🌐 Base URL: $env:BASE_URL" -ForegroundColor Cyan
Write-Host "👤 Test Email: $env:TEST_EMAIL" -ForegroundColor Cyan
Write-Host ""

# Determine test script and parameters
$testScript = ""
$testParams = @()

switch ($TestType) {
    "smoke" {
        Write-Host "🔍 Running smoke test..." -ForegroundColor Blue
        $testScript = "scripts/smoke-test.js"
    }
    "performance" {
        Write-Host "🚀 Running full performance test..." -ForegroundColor Blue
        $testScript = "kernlogic-performance.js"
    }
    "products" {
        Write-Host "📦 Running product-focused load test..." -ForegroundColor Blue
        $testScript = "scripts/product-load-test.js"
    }
    "light" {
        Write-Host "💡 Running light load test..." -ForegroundColor Blue
        $testScript = "kernlogic-performance.js"
        $testParams += "--vus", "5", "--duration", "1m"
    }
    "stress" {
        Write-Host "💪 Running stress test..." -ForegroundColor Blue
        $testScript = "kernlogic-performance.js"
        $testParams += "--vus", "25", "--duration", "5m"
    }
}

# Add verbose flag if requested
if ($Verbose) {
    $testParams += "--verbose"
}

# Run the test
try {
    $startTime = Get-Date
    
    if ($testParams.Count -gt 0) {
        Write-Host "Executing: k6 run $($testParams -join ' ') $testScript" -ForegroundColor Gray
        & k6 run @testParams $testScript
    } else {
        Write-Host "Executing: k6 run $testScript" -ForegroundColor Gray
        & k6 run $testScript
    }
    
    $exitCode = $LASTEXITCODE
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    Write-Host ""
    if ($exitCode -eq 0) {
        Write-Host "✅ Test completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Test failed with exit code: $exitCode" -ForegroundColor Red
    }
    
    Write-Host "⏱️  Test duration: $($duration.ToString('mm\:ss'))" -ForegroundColor Cyan
    Write-Host ""
    
    exit $exitCode
    
} catch {
    Write-Host "❌ ERROR running test: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 