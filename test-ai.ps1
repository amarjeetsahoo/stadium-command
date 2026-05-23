$body = @{
    location = 'Gate 4'
    type = 'Medical Emergency'
    severity = 'high'
    description = 'Spectator fainted in the heat'
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri 'http://localhost:3000/api/ai-analysis' -Method Post -Body $body -ContentType 'application/json'
$response | ConvertTo-Json -Depth 5
