$response = Invoke-RestMethod -Uri 'http://localhost:3000/api/validate-keys' -TimeoutSec 40

Write-Host ""
Write-Host "=== API KEY VALIDATION REPORT ===" -ForegroundColor Cyan
Write-Host ""

foreach ($result in $response.results) {
    $color = switch ($result.status) {
        "ok"      { "Green" }
        "missing" { "Yellow" }
        "error"   { "Red" }
        default   { "Gray" }
    }
    $icon = switch ($result.status) {
        "ok"      { "[OK]     " }
        "missing" { "[MISSING]" }
        "error"   { "[ERROR]  " }
        default   { "[?]      " }
    }
    Write-Host "$icon $($result.service): $($result.detail)" -ForegroundColor $color
    if ($result.keyPreview) {
        Write-Host "          Key preview: $($result.keyPreview)" -ForegroundColor DarkGray
    }
    if ($result.extras) {
        foreach ($extra in $result.extras.PSObject.Properties) {
            Write-Host "          $($extra.Name): $($extra.Value)" -ForegroundColor DarkGray
        }
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor White
Write-Host "  Total:   $($response.summary.total)" -ForegroundColor White
Write-Host "  OK:      $($response.summary.ok)" -ForegroundColor Green
Write-Host "  Missing: $($response.summary.missing)" -ForegroundColor Yellow
Write-Host "  Error:   $($response.summary.error)" -ForegroundColor Red
Write-Host ""
Write-Host "Ready flags:" -ForegroundColor White
Write-Host "  Phase 2 (Maps+Weather): $($response.summary.readyForPhase2)" -ForegroundColor $(if ($response.summary.readyForPhase2) { "Green" } else { "Yellow" })
Write-Host "  Phase 3 (Gemini AI):    $($response.summary.readyForPhase3)" -ForegroundColor $(if ($response.summary.readyForPhase3) { "Green" } else { "Yellow" })
Write-Host "  Auth (Firebase):        $($response.summary.readyForAuth)" -ForegroundColor $(if ($response.summary.readyForAuth) { "Green" } else { "Yellow" })
Write-Host ""
