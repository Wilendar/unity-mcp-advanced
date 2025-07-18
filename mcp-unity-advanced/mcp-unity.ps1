# MCP Unity Advanced - Auto-approve Script
# Autor: Kamil Wiliński
# Uruchamia MCP Unity Advanced bez pytania o zatwierdzenie

param(
    [string]$tool = "read_unity_console",
    [string]$filter = "all",
    [int]$lastLines = 50
)

$mcpPath = "G:\Unity Projects\ChaosAutoBattler\mcp-unity-advanced"
$command = @"
{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "$tool", "arguments": {"filter": "$filter", "last_lines": $lastLines}}, "id": 1}
"@

cd $mcpPath
Write-Host "Uruchamianie MCP Unity Advanced..." -ForegroundColor Yellow
Write-Host "Komenda: $tool" -ForegroundColor Green
Write-Host "Parametry: filter=$filter, lastLines=$lastLines" -ForegroundColor Green
Write-Host "---" -ForegroundColor Gray

echo $command | node src/index.js

Write-Host "---" -ForegroundColor Gray
Write-Host "Test zakonczony. Nacisnij Enter aby zamknac..." -ForegroundColor Cyan
Read-Host