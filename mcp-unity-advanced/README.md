# MCP Unity Advanced

Zaawansowany Model Context Protocol (MCP) serwer dla Unity Engine, zaprojektowany do pracy z Claude Code i innymi asystentami AI.

**Autor:** Kamil Wiliński

## 🎯 Funkcjonalności

### 🔍 Konsola i Debugowanie
- **read_unity_console** - Odczytuje logi Unity z filtrami (błędy, warnings, debug)
- **clear_unity_console** - Czyści konsolę Unity
- **send_debug_log** - Wysyła debug logi do Unity
- **get_compilation_errors** - Pobiera błędy kompilacji

### ⚙️ Projekt i Ustawienia  
- **get_unity_project_settings** - Pobiera ustawienia projektu Unity
- **update_unity_project_settings** - Aktualizuje ustawienia projektu
- **get_script_compilation_status** - Sprawdza status kompilacji skryptów
- **reload_assemblies** - Przeładowuje assemblies Unity

### 🎮 Sceny i GameObjects
- **get_active_scene_info** - Informacje o aktywnej scenie
- **select_gameobject** - Zaznacza GameObject w Unity
- **create_gameobject** - Tworzy nowy GameObject z komponentami

### 🧪 Testy i Build
- **run_unity_tests** - Uruchamia testy Unity (EditMode/PlayMode)
- **build_unity_project** - Buduje projekt dla różnych platform
- **execute_unity_menu** - Wykonuje opcje z menu Unity

### 📊 Monitoring i Performance
- **get_unity_performance_stats** - Statystyki wydajności Unity
- **watch_project_changes** - Monitoruje zmiany w projekcie

## 📦 Instalacja

### Wymagania
- Node.js >= 18.0.0
- Unity Editor (2022.3 LTS lub nowszy)
- Claude Code lub inny klient MCP

### Kroki instalacji

1. **Przejdź do katalogu MCP:**
```bash
cd "G:\\Unity Projects\\ChaosAutoBattler\\mcp-unity-advanced"
```

2. **Zainstaluj zależności:**
```bash
npm install
```

3. **Skonfiguruj w Claude Code:**
```bash
claude mcp add unity-advanced "node G:\\Unity Projects\\ChaosAutoBattler\\mcp-unity-advanced\\src\\index.js"
```

4. **Weryfikuj instalację:**
```bash
claude mcp list
```

## 🔧 Konfiguracja

### Automatyczne wykrywanie projektów Unity
MCP automatycznie wykrywa:
- Ścieżkę projektu Unity
- Lokalizację logów Unity
- Ustawienia projektu

### Ścieżki logów Unity
MCP sprawdza standardowe lokalizacje:
- Windows: `%APPDATA%\\Unity\\Editor\\Editor.log`
- macOS: `~/Library/Logs/Unity/Editor.log`
- Linux: `/tmp/UnityLogs/Editor.log`

## 🚀 Przykłady użycia

### Odczyt konsoli Unity
```javascript
// Pobierz wszystkie logi
await callTool('read_unity_console', { filter: 'all', last_lines: 100 });

// Tylko błędy
await callTool('read_unity_console', { filter: 'errors', last_lines: 50 });

// Tylko warnings
await callTool('read_unity_console', { filter: 'warnings' });
```

### Zarządzanie projektem
```javascript
// Pobierz ustawienia projektu
await callTool('get_unity_project_settings', { category: 'player' });

// Sprawdź błędy kompilacji
await callTool('get_compilation_errors');

// Uruchom testy
await callTool('run_unity_tests', { test_mode: 'editmode' });
```

### Manipulacja sceną
```javascript
// Informacje o scenie
await callTool('get_active_scene_info', { include_gameobjects: true });

// Stwórz GameObject
await callTool('create_gameobject', {
  name: 'Player',
  components: ['Rigidbody', 'BoxCollider']
});
```

## 📋 Zasoby (Resources)

### unity://console/logs
Dostęp do live logów konsoli Unity

### unity://project/settings  
Ustawienia projektu Unity w formacie JSON

### unity://compilation/errors
Aktualne błędy i warnings kompilacji

## 🔨 Development

### Struktura projektu
```
mcp-unity-advanced/
├── src/
│   └── index.js          # Główny serwer MCP
├── package.json          # Konfiguracja npm
├── README.md            # Dokumentacja
└── unity-bridge/        # Unity package (planowane)
```

### Uruchomienie w trybie dev
```bash
npm run dev
```

### Testowanie
```bash
# Test połączenia
node src/index.js

# Test z Claude Code
claude mcp test unity-advanced
```

## 🛠 Planowane funkcjonalności

### v1.1
- [ ] Unity Bridge Package
- [ ] Real-time console streaming
- [ ] Asset Database integration
- [ ] Scene serialization

### v1.2  
- [ ] Package Manager integration
- [ ] Build pipeline automation
- [ ] Profiler data access
- [ ] Timeline integration

### v1.3
- [ ] Visual Scripting support
- [ ] Addressables management
- [ ] Cloud Build integration
- [ ] Analytics integration

## 🐛 Rozwiązywanie problemów

### MCP nie łączy się z Unity
1. Sprawdź czy Unity Editor jest uruchomiony
2. Verificuj ścieżki logów Unity
3. Sprawdź uprawnienia do plików

### Brak logów konsoli
1. Sprawdź lokalizację Editor.log
2. Verificuj uprawnienia odczytu
3. Sprawdź czy logi nie są zablokowane

### Błędy kompilacji MCP
1. Sprawdź wersję Node.js (>=18.0.0)
2. Przeinstaluj zależności: `npm ci`
3. Sprawdź składnię JavaScript

## 📝 Changelog

### v1.0.0 (2025-07-12)
- ✅ Podstawowa struktura MCP
- ✅ Odczyt konsoli Unity
- ✅ Zarządzanie ustawieniami projektu
- ✅ Tools dla scen i GameObjects
- ✅ Framework dla testów i buildów
- ✅ System zasobów MCP

## 🤝 Wsparcie

Dla problemów i sugestii:
1. Sprawdź dokumentację Unity MCP
2. Verificuj logi Claude Code
3. Sprawdź kompatybilność wersji

## 📄 Licencja

MIT License - Zobacz plik LICENSE dla szczegółów

---

**Stworzone dla projektu Chaos Auto Battler**  
**Kompatybilne z Claude Code i Unity 6.1**