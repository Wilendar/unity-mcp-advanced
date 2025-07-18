# Instalacja MCP Unity Advanced

## 🔧 Instalacja w środowisku Windows/PowerShell

### Metoda 1: Konfiguracja ręczna

1. **Sprawdź lokalizację pliku konfiguracyjnego Claude Code:**
```powershell
# Standardowa lokalizacja:
# C:\Users\[USERNAME]\.claude\config.json
```

2. **Otwórz lub utwórz plik config.json:**
```json
{
  "mcpServers": {
    "unity-advanced": {
      "command": "node",
      "args": ["G:\\Unity Projects\\ChaosAutoBattler\\mcp-unity-advanced\\src\\index.js"],
      "env": {}
    }
  }
}
```

3. **Restart Claude Code**

### Metoda 2: Przez cmd/PowerShell (jeśli masz dostęp do claude cli)

```powershell
# Przejdź do katalogu MCP
cd "G:\Unity Projects\ChaosAutoBattler\mcp-unity-advanced"

# Dodaj MCP do Claude Code
claude mcp add unity-advanced "node G:\Unity Projects\ChaosAutoBattler\mcp-unity-advanced\src\index.js"

# Weryfikuj
claude mcp list
```

### Metoda 3: Testowanie bezpośrednie

```powershell
# Test działania MCP
cd "G:\Unity Projects\ChaosAutoBattler\mcp-unity-advanced"

# Test listy narzędzi
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | node src/index.js

# Test czytania logów Unity
echo '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "read_unity_console", "arguments": {"filter": "all", "last_lines": 10}}, "id": 1}' | node src/index.js
```

## ✅ Weryfikacja instalacji

### Sprawdź czy MCP działa:

1. **Lista narzędzi** - powinno zwrócić JSON z listą 16 narzędzi
2. **Test odczytu konsoli** - powinno próbować przeczytać logi Unity
3. **Brak błędów** - nie powinno być błędów Node.js

### Oczekiwany wynik:
```json
{
  "result": {
    "tools": [
      {"name": "read_unity_console", ...},
      {"name": "get_compilation_errors", ...},
      // ... 14 innych narzędzi
    ]
  }
}
```

## 🚀 Użycie w Claude Code

Po instalacji możesz używać narzędzi Unity bezpośrednio w Claude Code:

```
Claude, użyj narzędzia read_unity_console żeby sprawdzić błędy w Unity
```

```  
Claude, pobierz informacje o aktywnej scenie Unity używając get_active_scene_info
```

## 🔍 Dostępne narzędzia

- `read_unity_console` - Odczyt konsoli Unity
- `get_compilation_errors` - Błędy kompilacji  
- `get_unity_project_settings` - Ustawienia projektu
- `get_active_scene_info` - Informacje o scenie
- `run_unity_tests` - Uruchomienie testów
- `build_unity_project` - Budowanie projektu
- I 10 innych...

## 🐛 Rozwiązywanie problemów

### "command not found: claude"
- MCP działa, ale nie masz Claude Code CLI
- Użyj Metody 1 (konfiguracja ręczna)

### "Cannot find module"  
```powershell
cd "G:\Unity Projects\ChaosAutoBattler\mcp-unity-advanced"
npm install
```

### "Permission denied"
- Sprawdź uprawnienia do katalogu
- Uruchom PowerShell jako Administrator

### "No Unity logs found"
- Sprawdź czy Unity Editor jest uruchomiony
- Sprawdź standardowe lokalizacje logów:
  - `%APPDATA%\Unity\Editor\Editor.log`
  - `%USERPROFILE%\AppData\Local\Unity\Editor\Editor.log`

## 📝 Konfiguracja zaawansowana

### Dodaj zmienne środowiskowe:
```json
{
  "mcpServers": {
    "unity-advanced": {
      "command": "node",
      "args": ["G:\\Unity Projects\\ChaosAutoBattler\\mcp-unity-advanced\\src\\index.js"],
      "env": {
        "UNITY_PROJECT_PATH": "G:\\Unity Projects\\ChaosAutoBattler",
        "DEBUG": "true"
      }
    }
  }
}
```

### Logging i debug:
```powershell
# Uruchom z debug
$env:DEBUG="true"
node src/index.js
```

---

**Status: ✅ GOTOWE DO UŻYCIA**
**Ostatnia aktualizacja: 2025-07-12**