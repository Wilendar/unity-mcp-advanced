# MCP Unity Advanced - Auto-Start Script
# Autor: Kamil Wiliński
# Automatycznie uruchamia serwer MCP przy starcie projektu Unity

param(
    [switch]$Background = $false,
    [switch]$Silent = $false
)

$mcpPath = "G:\Unity Projects\ChaosAutoBattler\mcp-unity-advanced"
$logFile = "$mcpPath\auto-start.log"

function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    
    if (-not $Silent) {
        Write-Host $logEntry
    }
    
    Add-Content -Path $logFile -Value $logEntry
}

function Start-MCPServer {
    try {
        Write-Log "Uruchamianie MCP Unity Advanced..."
        
        # Przejdź do katalogu MCP
        Push-Location $mcpPath
        
        # Uruchom serwer MCP w trybie auto-start
        if ($Background) {
            Write-Log "Uruchamianie w tle..."
            $process = Start-Process -FilePath "node" -ArgumentList "src/auto-start.js" -NoNewWindow -PassThru
            Write-Log "Serwer MCP uruchomiony w tle (PID: $($process.Id))"
        } else {
            Write-Log "Uruchamianie w trybie interaktywnym..."
            node src/auto-start.js
        }
        
        Pop-Location
        
    } catch {
        Write-Log "BLAD: $($_.Exception.Message)"
        Pop-Location
        exit 1
    }
}

function Check-UnityProcess {
    $unityProcess = Get-Process -Name "Unity" -ErrorAction SilentlyContinue
    return $unityProcess -ne $null
}

function Check-NodeModules {
    $nodeModulesPath = "$mcpPath\node_modules"
    if (-not (Test-Path $nodeModulesPath)) {
        Write-Log "Brak node_modules - uruchamianie npm install..."
        Push-Location $mcpPath
        npm install
        Pop-Location
    }
}

# Główny skrypt
Write-Log "=== MCP Unity Advanced Auto-Start ==="
Write-Log "Sciezka MCP: $mcpPath"
Write-Log "Tryb tla: $Background"
Write-Log "Tryb cichy: $Silent"

# Sprawdź czy folder MCP istnieje
if (-not (Test-Path $mcpPath)) {
    Write-Log "BLAD: Folder MCP nie istnieje: $mcpPath"
    exit 1
}

# Sprawdź node_modules
Check-NodeModules

# Sprawdź czy Unity jest uruchomiony
if (Check-UnityProcess) {
    Write-Log "Unity wykryty - uruchamiam serwer MCP natychmiast"
    Start-MCPServer
} else {
    Write-Log "Unity nie wykryty - serwer MCP bedzie czekal na uruchomienie Unity"
    Start-MCPServer
}

Write-Log "=== Koniec Auto-Start ==="