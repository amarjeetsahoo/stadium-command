Write-Host ""
Write-Host "=== Testing /api/crowd-data ===" -ForegroundColor Cyan
$crowd = Invoke-RestMethod -Uri 'http://localhost:3000/api/crowd-data' -TimeoutSec 15
Write-Host "Gates returned: $($crowd.gates.Count)"
Write-Host "Total Occupancy: $($crowd.metrics.totalOccupancy)"
Write-Host "Avg Congestion: $($crowd.metrics.avgCongestion)%"
Write-Host "Red Gates: $($crowd.metrics.redGates)  Amber: $($crowd.metrics.amberGates)"
foreach ($gate in $crowd.gates) {
    $color = switch ($gate.status) { "green" { "Green" } "amber" { "Yellow" } "red" { "Red" } default { "Gray" } }
    Write-Host "  $($gate.id) -> $($gate.congestion)% [$($gate.status)] wait=$($gate.waitTime)min" -ForegroundColor $color
}

Write-Host ""
Write-Host "=== Testing /api/weather ===" -ForegroundColor Cyan
$wx = Invoke-RestMethod -Uri 'http://localhost:3000/api/weather' -TimeoutSec 15
Write-Host "Temp: $($wx.temp)°C  Feels: $($wx.feelsLike)°C"
Write-Host "Conditions: $($wx.description)"
Write-Host "Wind: $($wx.windSpeed) km/h  Humidity: $($wx.humidity)%"
Write-Host "Mock data: $($wx.isMock)  Rain alert: $($wx.rainAlert)"
Write-Host ""
