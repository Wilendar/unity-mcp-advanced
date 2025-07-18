# Unity MCP Advanced - Instrukcja Instalacji

## 🎯 Przegląd

Unity MCP Advanced to zaawansowane narzędzie do integracji Unity z Claude Code poprzez protokół MCP (Model Context Protocol). Zapewnia 32 narzędzia do zarządzania projektami Unity bezpośrednio z Claude Code.

## 📋 Wymagania

### Wymagania systemowe
- **System operacyjny:** Windows 10/11
- **Unity:** 2022.3 LTS lub nowsza
- **Node.js:** 18.x lub nowsza
- **PowerShell:** 5.1 lub nowsza
- **Git:** Do klonowania repozytorium

### Wymagania Claude Code
- **Claude Code CLI:** Najnowsza wersja
- **Konto Claude:** Z dostępem do MCP

## 🚀 Instalacja Krok Po Kroku

### Krok 1: Klonowanie Repozytorium

```bash
git clone https://github.com/wilendar/unity-mcp-advanced.git
cd unity-mcp-advanced
```

### Krok 2: Instalacja Zależności Node.js

```bash
cd mcp-unity-advanced
npm install
```

### Krok 3: Instalacja Unity Bridge

1. **Skopiuj folder UnityMcpBridge** do swojego projektu Unity:
   ```
   unity-mcp-advanced/UnityMcpBridge/ → YourProject/Assets/Editor/UnityMcpBridge/
   ```

2. **Otwórz projekt Unity** i poczekaj na kompilację

3. **Sprawdź konsole Unity** - powinien pojawić się komunikat:
   ```
   [Unity TCP Server] Initializing TCP server...
   [Unity TCP Server] Started on port 6401
   ```

### Krok 4: Konfiguracja Claude Code MCP

1. **Dodaj konfigurację MCP** do Claude Code:
   ```bash
   claude mcp add unity-mcp-advanced "node path/to/unity-mcp-advanced/mcp-unity-advanced/src/index.js"
   ```

2. **Sprawdź konfigurację:**
   ```bash
   claude mcp list
   ```

### Krok 5: Test Połączenia

1. **Uruchom Unity** z projektem
2. **Uruchom Claude Code** i użyj narzędzi MCP:
   ```bash
   claude
   ```
3. **Przetestuj komunikację:**
   - Sprawdź konsole Unity
   - Sprawdź błędy kompilacji
   - Sprawdź hierarchię obiektów

## 📁 Struktura Projektu

```
unity-mcp-advanced/
├── UnityMcpBridge/              # Unity Editor scripts
│   ├── SimpleMcpBridge.cs       # Unity MCP window
│   └── UnityTcpServer.cs        # TCP server dla komunikacji
├── mcp-unity-advanced/          # Node.js MCP server
│   ├── src/
│   │   ├── index.js            # Główny serwer MCP
│   │   ├── unity-bridge.js     # Bridge do Unity
│   │   └── auto-start.js       # Auto-start funkcjonalność
│   ├── package.json            # Zależności Node.js
│   └── config.json             # Konfiguracja serwera
├── start-mcp-unity.ps1         # PowerShell startup script
├── INSTALLATION.md             # Ta instrukcja
├── README.md                   # Dokumentacja główna
└── TROUBLESHOOTING.md          # Rozwiązywanie problemów
```

## ⚙️ Konfiguracja

### Konfiguracja Serwera MCP

Edytuj `mcp-unity-advanced/config.json`:

```json
{
  "server": {
    "port": 6401,
    "host": "localhost",
    "timeout": 30000
  },
  "settings": {
    "autoStart": true,
    "checkInterval": 5000,
    "retryInterval": 10000,
    "maxRetries": 3,
    "autoApprove": true,
    "logLevel": "info"
  },
  "unity": {
    "projectPath": "auto-detect",
    "logPath": "auto-detect",
    "processName": "Unity.exe"
  }
}
```

### Konfiguracja Auto-Start

Dla automatycznego uruchamiania serwera MCP:

```bash
# Uruchom z auto-start
node src/index.js --auto-start

# Lub użyj PowerShell script
./start-mcp-unity.ps1
```

## 🔧 Dostępne Narzędzia

Unity MCP Advanced dostarcza **32 narzędzia** do zarządzania Unity:

### 📋 Podstawowe Narzędzia
- `read_unity_console` - Odczyt logów Unity
- `clear_unity_console` - Czyszczenie konsoli
- `get_compilation_errors` - Sprawdzenie błędów kompilacji
- `get_active_scene_info` - Informacje o aktywnej scenie
- `focus_unity_window` - Wymuszenie focus okna Unity

### 🎮 Zarządzanie Play Mode
- `start_play_mode` - Uruchomienie trybu Play
- `stop_play_mode` - Zatrzymanie trybu Play
- `get_play_mode_status` - Status trybu Play

### 🗂️ Zarządzanie Hierarchią
- `get_hierarchy_objects` - Lista obiektów w hierarchii
- `select_hierarchy_object` - Zaznaczenie obiektu
- `create_hierarchy_object` - Tworzenie nowego obiektu
- `delete_hierarchy_object` - Usuwanie obiektu

### 🔧 Zarządzanie Komponentami
- `get_component_properties` - Właściwości komponentu
- `set_component_property` - Ustawienie właściwości
- `add_component` - Dodanie komponentu
- `remove_component` - Usunięcie komponentu

### 🧩 Zarządzanie Prefabami
- `create_prefab` - Tworzenie prefaba
- `save_prefab` - Zapisywanie prefaba
- `load_prefab` - Ładowanie prefaba
- `list_prefabs` - Lista prefabów

### 🎯 Testowanie GameManager
- `trigger_gamemanager_method` - Wywołanie metody GameManager
- `get_gamemanager_state` - Stan GameManager

### ⚙️ Pozostałe Narzędzia
- `execute_unity_menu` - Wykonanie opcji menu
- `get_unity_project_settings` - Ustawienia projektu
- `update_unity_project_settings` - Aktualizacja ustawień
- `create_gameobject` - Tworzenie GameObjectów
- `select_gameobject` - Zaznaczanie obiektów

## 🏃‍♂️ Szybki Start

### Przykład użycia w Claude Code:

```bash
# Sprawdź błędy kompilacji
> Sprawdź błędy kompilacji Unity

# Odczytaj konsole Unity
> Odczytaj ostatnie 20 linii z konsoli Unity

# Uruchom tryb Play
> Uruchom tryb Play w Unity

# Sprawdź hierarchię obiektów
> Pokaż obiekty w hierarchii Unity

# Utwórz nowy obiekt
> Utwórz nowy GameObject o nazwie "TestObject"
```

## 🔍 Weryfikacja Instalacji

### Test komunikacji:
1. Otwórz Unity z projektem
2. Uruchom Claude Code
3. Wykonaj komendę sprawdzającą:
   ```bash
   > Sprawdź konsole Unity
   ```

### Oczekiwane rezultaty:
- ✅ Brak błędów kompilacji
- ✅ TCP server aktywny na porcie 6401
- ✅ Komunikacja z Claude Code działa
- ✅ Narzędzia MCP dostępne

## 📞 Wsparcie

W przypadku problemów sprawdź:
1. **TROUBLESHOOTING.md** - Rozwiązywanie problemów
2. **README.md** - Dokumentacja szczegółowa
3. **Issues** - Zgłaszanie problemów na GitHub

## 👤 Autor

**Kamil Wiliński**
- Email: wilendar@gmail.com
- GitHub: @wilendar

## 📄 Licencja

MIT License - szczegóły w pliku LICENSE

---

*Wersja: 1.0.0*  
*Data: 2025-07-18*