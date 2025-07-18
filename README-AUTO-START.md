# MCP Unity Advanced - Auto-Start Setup

## 🎯 Cel

Automatyczne uruchamianie serwera MCP Unity Advanced przy starcie sesji Claude dla projektu ChaosAutoBattler.

## 📋 Funkcjonalności

### ✅ Zaimplementowano

1. **Auto-Start Configuration**
   - Konfiguracja auto-start w `config.json`
   - Wykrywanie procesu Unity
   - Automatyczne uruchamianie serwera

2. **PowerShell Scripts**
   - `start-mcp-unity.ps1` - główny skrypt startowy
   - `auto-start-mcp.ps1` - skrypt auto-start z monitoringiem

3. **Node.js Enhancements**
   - Nowy tryb `--auto-start`
   - Monitoring procesu Unity
   - Konfigurowalne interwały sprawdzania

## 🚀 Użycie

### Metoda 1: Przez PowerShell Script

```powershell
# Uruchamianie w trybie interaktywnym
.\start-mcp-unity.ps1

# Uruchamianie w tle
.\start-mcp-unity.ps1 -Background

# Wymuś restart (jeśli już działa)
.\start-mcp-unity.ps1 -Force
```

### Metoda 2: Bezpośrednio przez Node.js

```bash
# Tryb auto-start
node src/index.js --auto-start

# Tryb standardowy
node src/index.js

# Przez npm
npm run auto-start
```

### Metoda 3: Przez konfigurację

Ustaw `autoStart: true` w `config.json`:

```json
{
  "settings": {
    "autoStart": true,
    "checkInterval": 5000,
    "retryInterval": 10000
  }
}
```

## ⚙️ Konfiguracja

### config.json

```json
{
  "settings": {
    "autoApprove": true,
    "autoStart": true,
    "logLevel": "info",
    "unityProjectPath": "G:\\Unity Projects\\ChaosAutoBattler",
    "enableFileWatch": true,
    "maxLogLines": 500,
    "checkInterval": 5000,
    "retryInterval": 10000
  }
}
```

### Parametry

- `autoStart`: Automatyczne uruchamianie przy starcie
- `checkInterval`: Interwał sprawdzania Unity (ms)
- `retryInterval`: Interwał retry po błędzie (ms)
- `unityProjectPath`: Ścieżka do projektu Unity

## 🔧 Jak to działa

1. **Wykrywanie Unity**: Serwer sprawdza czy proces `Unity.exe` działa
2. **Monitoring**: Jeśli Unity nie działa, czeka i sprawdza ponownie
3. **Auto-Start**: Gdy Unity zostanie wykryty, uruchamia pełny serwer MCP
4. **Retry Logic**: W przypadku błędów, próbuje ponownie po określonym czasie

## 📊 Przykładowe logi

```
[MCP Unity Advanced] Tryb auto-start aktywowany
[MCP Unity Advanced] Konfiguracja auto-start: true
[Auto-Start] Sprawdzam Unity proces...
[Auto-Start] Unity nie wykryty - czekam na uruchomienie
[Auto-Start] Unity wykryty - uruchamiam serwer MCP
Unity MCP Advanced Server uruchomiony pomyślnie
```

## 🛠️ Troubleshooting

### Serwer nie startuje automatycznie

1. Sprawdź konfigurację `autoStart` w `config.json`
2. Upewnij się, że Unity jest uruchomiony
3. Sprawdź logi w `auto-start.log`

### Błąd "require is not defined"

- Naprawiono: używamy `import` zamiast `require`
- Upewnij się, że `"type": "module"` w `package.json`

### Problemy z kodowaniem w PowerShell

- Usunięto polskie znaki diakrytyczne
- Używane ASCII zamiast UTF-8

## 🎯 Dostępne narzędzia MCP

Po uruchomieniu serwera dostępne jest 32 narzędzia:

- `read_unity_console` - odczyt logów Unity
- `focus_unity_window` - focus okna Unity
- `get_compilation_errors` - błędy kompilacji
- `start_play_mode` / `stop_play_mode` - kontrola Play mode
- `get_hierarchy_objects` - lista obiektów w hierarchii
- `create_prefab` / `load_prefab` - zarządzanie prefabami
- i wiele innych...

## 📝 Przykłady komend

```bash
# Odczyt konsoli Unity
echo '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "read_unity_console", "arguments": {"filter": "all", "last_lines": 20}}, "id": 1}' | node src/index.js

# Focus Unity
echo '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "focus_unity_window", "arguments": {}}, "id": 1}' | node src/index.js

# Błędy kompilacji
echo '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "get_compilation_errors", "arguments": {}}, "id": 1}' | node src/index.js
```

## 🏆 Status

**✅ GOTOWE** - Serwer MCP Unity Advanced z auto-start działa poprawnie!

Autor: Kamil Wiliński
Data: 17.07.2025
Wersja: 1.0.0