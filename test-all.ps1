# test-all.ps1
# Full-fledged Automated End-to-End Test Suite for Stadium Mission Control
# Resolves: "test cases do the testing, full fledge"

Write-Host "==========================================================" -ForegroundColor Magenta
Write-Host "Stadium Command Center - End-to-End Test Suite" -ForegroundColor Magenta
Write-Host "==========================================================" -ForegroundColor Magenta

# 1. Read API Key from .env.local
$envPath = Join-Path $PSScriptRoot ".env.local"
if (-not (Test-Path $envPath)) {
    Write-Host "[ERROR] .env.local file not found at $envPath" -ForegroundColor Red
    exit 1
}

$envFile = Get-Content -Path $envPath
$firebaseApiKey = ""
foreach ($line in $envFile) {
    if ($line -match "NEXT_PUBLIC_FIREBASE_API_KEY=(.*)") {
        $firebaseApiKey = $Matches[1].Trim()
    }
}

if (-not $firebaseApiKey) {
    Write-Host "[ERROR] NEXT_PUBLIC_FIREBASE_API_KEY not found in .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Extracted Firebase Key: $($firebaseApiKey.SubString(0, 8))..." -ForegroundColor Gray

# 2. Authenticate to retrieve Firebase ID Token
Write-Host ""
Write-Host "Authenticating demo user via Firebase REST API..." -ForegroundColor Cyan
$authUrl = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$firebaseApiKey"
$authBody = @{
    email = "demo@crowdcommand.io"
    password = "demo1234"
    returnSecureToken = $true
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod -Uri $authUrl -Method Post -Body $authBody -ContentType "application/json"
    $idToken = $authResponse.idToken
    Write-Host "  [OK] Session initialized. Token acquired." -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Authentication failed: $_" -ForegroundColor Red
    Write-Host "  Please ensure Firebase is configured and the demo user is created." -ForegroundColor Yellow
    exit 1
}

$headers = @{
    Authorization = "Bearer $idToken"
}

# 3. Test Cases Configuration
$tests = @(
    @{
        Name = "GET /api/crowd-data (Unauthorized Check)"
        Uri = "http://localhost:3000/api/crowd-data"
        Method = "GET"
        Auth = $false
        ExpectedStatus = 401
    },
    @{
        Name = "GET /api/crowd-data (Authorized Fetch)"
        Uri = "http://localhost:3000/api/crowd-data"
        Method = "GET"
        Auth = $true
        ExpectedStatus = 200
    },
    @{
        Name = "GET /api/weather (Unauthorized Check)"
        Uri = "http://localhost:3000/api/weather"
        Method = "GET"
        Auth = $false
        ExpectedStatus = 401
    },
    @{
        Name = "GET /api/weather (Authorized Fetch)"
        Uri = "http://localhost:3000/api/weather"
        Method = "GET"
        Auth = $true
        ExpectedStatus = 200
    },
    @{
        Name = "POST /api/ai-analysis (Unauthorized Check)"
        Uri = "http://localhost:3000/api/ai-analysis"
        Method = "POST"
        Auth = $false
        Body = @{
            location = "Gate 3"
            type = "Medical Emergency"
            severity = "medium"
            description = "Fainting in queue"
        }
        ExpectedStatus = 401
    },
    @{
        Name = "POST /api/ai-analysis (Authorized Threat Report)"
        Uri = "http://localhost:3000/api/ai-analysis"
        Method = "POST"
        Auth = $true
        Body = @{
            location = "Gate 3"
            type = "Medical Emergency"
            severity = "medium"
            description = "Fainting in queue"
        }
        ExpectedStatus = 200
    },
    @{
        Name = "POST /api/alerts (Unauthorized Check)"
        Uri = "http://localhost:3000/api/alerts"
        Method = "POST"
        Auth = $false
        Body = @{
            zone = "Gate 2"
            message = "Deploying emergency staff to Gate 2"
            type = "warning"
        }
        ExpectedStatus = 401
    },
    @{
        Name = "POST /api/alerts (Authorized Broadcast)"
        Uri = "http://localhost:3000/api/alerts"
        Method = "POST"
        Auth = $true
        Body = @{
            zone = "Gate 2"
            message = "Deploying emergency staff to Gate 2"
            type = "warning"
        }
        ExpectedStatus = 201
    }
)

# 4. Execute Tests
Write-Host ""
Write-Host "Executing Test Matrix..." -ForegroundColor Cyan
Write-Host "----------------------------------------------------------" -ForegroundColor Gray

$passed = 0
$failed = 0

foreach ($test in $tests) {
    Write-Host "Running: $($test.Name)..." -ForegroundColor White
    
    $reqHeaders = @{}
    if ($test.Auth) {
        $reqHeaders = $headers
    }
    
    $reqBody = $null
    if ($test.Body) {
        $reqBody = $test.Body | ConvertTo-Json
    }

    try {
        $response = $null
        $statusCode = 200
        
        if ($test.Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $test.Uri -Headers $reqHeaders -Method Get -TimeoutSec 15 -UseBasicParsing
            $statusCode = $response.StatusCode
        } else {
            $response = Invoke-WebRequest -Uri $test.Uri -Headers $reqHeaders -Method Post -Body $reqBody -ContentType "application/json" -TimeoutSec 15 -UseBasicParsing
            $statusCode = $response.StatusCode
        }
        
        if ($statusCode -eq $test.ExpectedStatus) {
            Write-Host "  [PASS] Status code matched: $statusCode" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "  [FAIL] Expected Status $($test.ExpectedStatus), got $statusCode" -ForegroundColor Red
            $failed++
        }
    } catch {
        # Check HTTP Status Code from the exception
        $status = $_.Exception.Response.StatusCode.value__
        if ($status -eq $test.ExpectedStatus) {
            Write-Host "  [PASS] Status code matched expected error: $status" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "  [FAIL] Request failed. Expected status $($test.ExpectedStatus), got $status. Error: $_" -ForegroundColor Red
            $failed++
        }
    }
    Write-Host "----------------------------------------------------------" -ForegroundColor Gray
}

# 5. Report Summary
Write-Host ""
Write-Host "TEST RUN SUMMARY" -ForegroundColor Cyan
Write-Host "  Passed: $passed" -ForegroundColor Green
Write-Host "  Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "SUCCESS: ALL E2E ENDPOINTS HAVE PASSED SECURITY & TELEMETRY CHECKS!" -ForegroundColor Green
} else {
    Write-Host "WARNING: SOME TEST CASES FAILED. Please review the output above." -ForegroundColor Yellow
}
Write-Host ""
