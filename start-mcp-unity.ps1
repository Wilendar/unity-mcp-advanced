# Start MCP Unity Advanced for ChaosAutoBattler Project
# Autor: Kamil Wiliński
# Uruchamia serwer MCP przy starcie sesji Claude dla tego projektu

param(
    [switch]$Background = $false,
    [switch]$Force = $false
)

$projectPath = "G:\Unity Projects\ChaosAutoBattler"
$mcpPath = "$projectPath\mcp-unity-advanced"
$mcpScript = "$mcpPath\auto-start-mcp.ps1"

Write-Host "Uruchamianie MCP Unity Advanced dla ChaosAutoBattler..." -ForegroundColor Green

# Sprawdź czy jesteśmy w prawidłowym katalogu
if (-not (Test-Path $projectPath)) {
    Write-Host "Nie znaleziono projektu: $projectPath" -ForegroundColor Red
    exit 1
}

# Sprawdź czy MCP istnieje
if (-not (Test-Path $mcpScript)) {
    Write-Host "Nie znaleziono skryptu MCP: $mcpScript" -ForegroundColor Red
    exit 1
}

# Sprawdź czy serwer MCP już działa
$existingProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq "node" }
if ($existingProcess -and -not $Force) {
    Write-Host "Serwer MCP moze juz dzialac. Uzyj -Force aby wymusic restart." -ForegroundColor Yellow
    Write-Host "Istniejace procesy Node.js:" -ForegroundColor Yellow
    $existingProcess | Format-Table Id, ProcessName, CPU -AutoSize
}

# Uruchom MCP
try {
    Write-Host "Uruchamianie MCP Unity Advanced..." -ForegroundColor Cyan
    
    if ($Background) {
        Write-Host "Tryb tla aktywowany" -ForegroundColor Blue
        & $mcpScript -Background -Silent
    } else {
        Write-Host "Tryb interaktywny" -ForegroundColor Blue
        & $mcpScript
    }
    
    Write-Host "MCP Unity Advanced uruchomiony pomyslnie!" -ForegroundColor Green
    
} catch {
    Write-Host "Blad uruchamiania MCP: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Komendy MCP:" -ForegroundColor White
Write-Host "  - Odczyt konsoli Unity: echo '{\"jsonrpc\": \"2.0\", \"method\": \"tools/call\", \"params\": {\"name\": \"read_unity_console\", \"arguments\": {\"filter\": \"all\", \"last_lines\": 20}}, \"id\": 1}' | node src/index.js" -ForegroundColor Gray
Write-Host "  - Focus Unity: echo '{\"jsonrpc\": \"2.0\", \"method\": \"tools/call\", \"params\": {\"name\": \"focus_unity_window\", \"arguments\": {}}, \"id\": 1}' | node src/index.js" -ForegroundColor Gray
Write-Host "  - Bledy kompilacji: echo '{\"jsonrpc\": \"2.0\", \"method\": \"tools/call\", \"params\": {\"name\": \"get_compilation_errors\", \"arguments\": {}}, \"id\": 1}' | node src/index.js" -ForegroundColor Gray
Write-Host ""
Write-Host "Serwer MCP gotowy do uzycia!" -ForegroundColor Green