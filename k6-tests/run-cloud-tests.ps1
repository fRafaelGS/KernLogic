param(
    [Parameter(Position=0)]
    [ValidateSet("smoke", "performance", "products", "light", "stress")]
    [string]$TestType = "smoke",
    
    [Parameter(Position=1)]
    [ValidateSet("local", "dev", "staging", "production")]
    [string]$Environment = "local",
    
    [Parameter(Position=2)]
    [ValidateSet("k6-cloud", "prometheus", "influxdb", "json", "cloud-local")]
    [string]$OutputType = "k6-cloud",
    
    [switch]$Verbose,
    [switch]$Help,
    [string]$ProjectName = "KernLogic API Performance",
    [string]$Tags = ""
)

function Show-Help {
    Write-Host ""
    Write-Host "KernLogic k6 Performance Test Runner with Grafana Cloud Integration" -ForegroundColor Green
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usage: ./run-cloud-tests.ps1 [TestType] [Environment] [OutputType] [Options]" -ForegroundColor Yellow
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
    Write-Host "Output Types:" -ForegroundColor Cyan
    Write-Host "  k6-cloud     - Upload and run in k6 Cloud (recommended)"
    Write-Host "  cloud-local  - Run locally, stream results to k6 Cloud"
    Write-Host "  prometheus   - Send metrics to Grafana Cloud Prometheus"
    Write-Host "  influxdb     - Send metrics to Grafana Cloud InfluxDB"
    Write-Host "  json         - Output JSON for local analysis"
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "  -Verbose     - Show detailed output"
    Write-Host "  -Help        - Show this help message"
    Write-Host "  -ProjectName - Custom project name for k6 Cloud"
    Write-Host "  -Tags        - Additional tags for test runs (comma-separated)"
    Write-Host ""
    Write-Host "Required Environment Variables:" -ForegroundColor Yellow
    Write-Host "  For k6 Cloud:"
    Write-Host "    K6_CLOUD_TOKEN          - Your k6 Cloud API token"
    Write-Host "    K6_CLOUD_PROJECT_ID     - Your k6 Cloud project ID (optional)"
    Write-Host ""
    Write-Host "  For Grafana Cloud Prometheus:"
    Write-Host "    GRAFANA_CLOUD_PROM_URL  - Prometheus remote write URL"
    Write-Host "    GRAFANA_CLOUD_PROM_USER - Prometheus username"
    Write-Host "    GRAFANA_CLOUD_PROM_TOKEN - Prometheus API token"
    Write-Host ""
    Write-Host "  For Grafana Cloud InfluxDB:"
    Write-Host "    GRAFANA_CLOUD_INFLUX_URL   - InfluxDB URL"
    Write-Host "    GRAFANA_CLOUD_INFLUX_TOKEN - InfluxDB token"
    Write-Host "    GRAFANA_CLOUD_INFLUX_ORG   - InfluxDB organization"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  ./run-cloud-tests.ps1 smoke local k6-cloud"
    Write-Host "  ./run-cloud-tests.ps1 performance staging prometheus -Verbose"
    Write-Host "  ./run-cloud-tests.ps1 products dev cloud-local -ProjectName 'Dev Testing'"
    Write-Host ""
}

function Test-RequiredVariables {
    param($OutputType)
    
    $missing = @()
    
    switch ($OutputType) {
        "k6-cloud" {
            if (-not $env:K6_CLOUD_TOKEN) { $missing += "K6_CLOUD_TOKEN" }
        }
        "cloud-local" {
            if (-not $env:K6_CLOUD_TOKEN) { $missing += "K6_CLOUD_TOKEN" }
        }
        "prometheus" {
            if (-not $env:GRAFANA_CLOUD_PROM_URL) { $missing += "GRAFANA_CLOUD_PROM_URL" }
            if (-not $env:GRAFANA_CLOUD_PROM_USER) { $missing += "GRAFANA_CLOUD_PROM_USER" }
            if (-not $env:GRAFANA_CLOUD_PROM_TOKEN) { $missing += "GRAFANA_CLOUD_PROM_TOKEN" }
        }
        "influxdb" {
            if (-not $env:GRAFANA_CLOUD_INFLUX_URL) { $missing += "GRAFANA_CLOUD_INFLUX_URL" }
            if (-not $env:GRAFANA_CLOUD_INFLUX_TOKEN) { $missing += "GRAFANA_CLOUD_INFLUX_TOKEN" }
            if (-not $env:GRAFANA_CLOUD_INFLUX_ORG) { $missing += "GRAFANA_CLOUD_INFLUX_ORG" }
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "❌ Missing required environment variables for $OutputType output:" -ForegroundColor Red
        $missing | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
        Write-Host ""
        Write-Host "Please set these variables before running the test." -ForegroundColor Yellow
        Write-Host "Use './run-cloud-tests.ps1 -Help' for more information." -ForegroundColor Yellow
        return $false
    }
    return $true
}

if ($Help) {
    Show-Help
    exit 0
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " KernLogic k6 Performance Test Runner - Grafana Cloud" -ForegroundColor Green  
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Test Type: $TestType" -ForegroundColor Yellow
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Output Type: $OutputType" -ForegroundColor Yellow
Write-Host "Project Name: $ProjectName" -ForegroundColor Yellow
if ($Tags) { Write-Host "Tags: $Tags" -ForegroundColor Yellow }
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

# Check required environment variables for selected output type
if (-not (Test-RequiredVariables -OutputType $OutputType)) {
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

# Determine test script and base parameters
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

# Configure output based on type
$outputParams = @()
$k6Command = "run"

switch ($OutputType) {
    "k6-cloud" {
        Write-Host "☁️  Uploading and running in k6 Cloud..." -ForegroundColor Magenta
        $k6Command = "cloud"
        
        # Set project name in environment variable for k6 Cloud
        $env:K6_CLOUD_NAME = "$ProjectName - $Environment - $TestType"
        
        if ($Tags) {
            $env:K6_CLOUD_TAGS = $Tags
        }
    }
    "cloud-local" {
        Write-Host "🔄 Running locally with k6 Cloud output..." -ForegroundColor Magenta
        $outputParams += "--out", "cloud"
        
        # Set project name for cloud output
        $env:K6_CLOUD_NAME = "$ProjectName - $Environment - $TestType (Local)"
    }
    "prometheus" {
        Write-Host "📊 Sending metrics to Grafana Cloud Prometheus..." -ForegroundColor Magenta
        $prometheusUrl = "http://$($env:GRAFANA_CLOUD_PROM_USER):$($env:GRAFANA_CLOUD_PROM_TOKEN)@$($env:GRAFANA_CLOUD_PROM_URL -replace 'https://', '')"
        $outputParams += "--out", "experimental-prometheus-rw=$prometheusUrl"
    }
    "influxdb" {
        Write-Host "📈 Sending metrics to Grafana Cloud InfluxDB..." -ForegroundColor Magenta
        $influxUrl = "$($env:GRAFANA_CLOUD_INFLUX_URL)?org=$($env:GRAFANA_CLOUD_INFLUX_ORG)&bucket=k6&token=$($env:GRAFANA_CLOUD_INFLUX_TOKEN)"
        $outputParams += "--out", "influxdb=$influxUrl"
    }
    "json" {
        Write-Host "📄 Outputting results to JSON file..." -ForegroundColor Magenta
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $jsonFile = "results/$($TestType)-$($Environment)-$timestamp.json"
        
        # Create results directory if it doesn't exist
        if (-not (Test-Path "results")) {
            New-Item -ItemType Directory -Path "results" | Out-Null
        }
        
        $outputParams += "--out", "json=$jsonFile"
        Write-Host "📁 Results will be saved to: $jsonFile" -ForegroundColor Cyan
    }
}

# Add verbose flag if requested
if ($Verbose) {
    $testParams += "--verbose"
}

# Add tags if specified and not using k6 Cloud (which has its own tag mechanism)
if ($Tags -and $OutputType -ne "k6-cloud") {
    $testParams += "--tag", "environment=$Environment", "--tag", "test_type=$TestType"
    
    # Add custom tags
    $Tags -split "," | ForEach-Object {
        $tag = $_.Trim()
        if ($tag) {
            $testParams += "--tag", $tag
        }
    }
}

# Combine all parameters
$allParams = $testParams + $outputParams

# Run the test
try {
    $startTime = Get-Date
    
    # Build and display the command
    $commandDisplay = "k6 $k6Command"
    if ($allParams.Count -gt 0) {
        $commandDisplay += " $($allParams -join ' ')"
    }
    $commandDisplay += " $testScript"
    
    Write-Host "Executing: $commandDisplay" -ForegroundColor Gray
    Write-Host ""
    
    # Execute the command
    if ($allParams.Count -gt 0) {
        & k6 $k6Command @allParams $testScript
    } else {
        & k6 $k6Command $testScript
    }
    
    $exitCode = $LASTEXITCODE
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Gray
    
    if ($exitCode -eq 0) {
        Write-Host "✅ Test completed successfully!" -ForegroundColor Green
        
        # Provide links based on output type
        switch ($OutputType) {
            "k6-cloud" {
                Write-Host "🔗 View results in k6 Cloud: https://app.k6.io/projects" -ForegroundColor Cyan
            }
            "cloud-local" {
                Write-Host "🔗 View results in k6 Cloud: https://app.k6.io/projects" -ForegroundColor Cyan
            }
            "prometheus" {
                Write-Host "🔗 View metrics in Grafana Cloud: https://your-instance.grafana.net" -ForegroundColor Cyan
            }
            "influxdb" {
                Write-Host "🔗 View metrics in Grafana Cloud: https://your-instance.grafana.net" -ForegroundColor Cyan
            }
            "json" {
                Write-Host "📁 Results saved to: $jsonFile" -ForegroundColor Cyan
            }
        }
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