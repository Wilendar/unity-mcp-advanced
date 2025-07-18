# Unity MCP Advanced 🚀

**Zaawansowane narzędzie integracji Unity z Claude Code poprzez protokół MCP**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Unity](https://img.shields.io/badge/Unity-2022.3%2B-blue.svg)](https://unity.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x%2B-green.svg)](https://nodejs.org/)
[![PowerShell](https://img.shields.io/badge/PowerShell-5.1%2B-blue.svg)](https://docs.microsoft.com/powershell/)

## 🎯 Czym jest Unity MCP Advanced?

Unity MCP Advanced to kompleksowe rozwiązanie umożliwiające bezpośrednie zarządzanie projektami Unity poprzez Claude Code. Wykorzystuje protokół MCP (Model Context Protocol) do zapewnienia 32 zaawansowanych narzędzi do debugowania, testowania i zarządzania projektami Unity.

### ✨ Kluczowe Funkcje

- **32 narzędzia MCP** do zarządzania Unity
- **Automatyczne uruchamianie** serwera MCP
- **Real-time komunikacja** z Unity Editor
- **Zarządzanie hierarchią** obiektów
- **Kontrola Play Mode** i debugowanie
- **Zarządzanie prefabami** i komponentami
- **Testowanie GameManager** i custom scripts
- **Auto-focus** okna Unity
- **Robust error handling** z ThreadAbortException

## 🚀 Szybki Start

### Instalacja

```bash
# Klonuj repozytorium
git clone https://github.com/wilendar/unity-mcp-advanced.git
cd unity-mcp-advanced

# Zainstaluj zależności
cd mcp-unity-advanced
npm install

# Skopiuj Unity Bridge do projektu
cp -r UnityMcpBridge YourProject/Assets/Editor/

# Skonfiguruj Claude Code MCP
claude mcp add unity-mcp-advanced "node path/to/mcp-unity-advanced/src/index.js"
```

### Pierwsze użycie

```bash
# Uruchom Unity z projektem
# Uruchom Claude Code
claude

# Przetestuj komunikację
> Sprawdź konsole Unity
> Sprawdź błędy kompilacji
> Uruchom tryb Play
```

## 📋 Dostępne Narzędzia

### 🔧 Podstawowe Debugowanie
| Narzędzie | Opis |
|-----------|------|
| `read_unity_console` | Odczyt logów Unity (błędy, warnings, debug) |
| `clear_unity_console` | Czyszczenie konsoli Unity |
| `get_compilation_errors` | Sprawdzenie błędów kompilacji |
| `send_debug_log` | Wysłanie debug log do Unity |
| `focus_unity_window` | Wymuszenie focus okna Unity |

### 🎮 Kontrola Play Mode
| Narzędzie | Opis |
|-----------|------|
| `start_play_mode` | Uruchomienie trybu Play |
| `stop_play_mode` | Zatrzymanie trybu Play |
| `get_play_mode_status` | Sprawdzenie statusu trybu Play |

### 🗂️ Zarządzanie Hierarchią
| Narzędzie | Opis |
|-----------|------|
| `get_hierarchy_objects` | Lista obiektów w hierarchii |
| `select_hierarchy_object` | Zaznaczenie obiektu w hierarchii |
| `create_hierarchy_object` | Tworzenie nowego obiektu |
| `delete_hierarchy_object` | Usuwanie obiektu z hierarchii |

### 🔧 Zarządzanie Komponentami
| Narzędzie | Opis |
|-----------|------|
| `get_component_properties` | Pobieranie właściwości komponentu |
| `set_component_property` | Ustawienie właściwości komponentu |
| `add_component` | Dodanie komponentu do obiektu |
| `remove_component` | Usunięcie komponentu z obiektu |

### 🧩 Zarządzanie Prefabami
| Narzędzie | Opis |
|-----------|------|
| `create_prefab` | Tworzenie prefaba z GameObject |
| `save_prefab` | Zapisywanie prefaba do pliku |
| `load_prefab` | Ładowanie prefaba i tworzenie instancji |
| `create_placeholder_prefab` | Tworzenie placeholder prefaba |
| `list_prefabs` | Lista wszystkich prefabów w projekcie |

### 🎯 Testowanie GameManager
| Narzędzie | Opis |
|-----------|------|
| `trigger_gamemanager_method` | Wywołanie metody GameManager |
| `get_gamemanager_state` | Pobieranie stanu GameManager |

### ⚙️ Zarządzanie Projektem
| Narzędzie | Opis |
|-----------|------|
| `get_unity_project_settings` | Pobieranie ustawień projektu |
| `update_unity_project_settings` | Aktualizacja ustawień projektu |
| `get_active_scene_info` | Informacje o aktywnej scenie |
| `execute_unity_menu` | Wykonanie opcji menu Unity |

## 🏗️ Architektura

```
Unity MCP Advanced
├── Unity Bridge (C#)
│   ├── UnityTcpServer.cs      # TCP server (port 6401)
│   └── SimpleMcpBridge.cs     # Unity MCP window
├── MCP Server (Node.js)
│   ├── index.js               # Główny serwer MCP
│   ├── unity-bridge.js        # Bridge do Unity
│   └── auto-start.js          # Auto-start funkcjonalność
└── PowerShell Scripts
    └── start-mcp-unity.ps1    # Startup script
```

### Przepływ Komunikacji

```
Claude Code → MCP Server → TCP (port 6401) → Unity Editor
         ←               ←                  ←
```

## 📖 Przykłady Użycia

### Debugowanie Projektu

```bash
# Sprawdź błędy kompilacji
> Sprawdź czy mój kod Unity ma błędy kompilacji

# Odczytaj konsole Unity
> Pokaż mi ostatnie 30 linii z konsoli Unity

# Wymusz focus Unity window
> Wymuś focus okna Unity na pierwszy plan
```

### Zarządzanie Obiektami

```bash
# Sprawdź hierarchię
> Pokaż mi wszystkie obiekty w hierarchii Unity

# Utwórz nowy obiekt
> Utwórz nowy GameObject o nazwie "TestPlayer" typu Cube

# Dodaj komponent
> Dodaj komponent Rigidbody do obiektu "TestPlayer"

# Sprawdź właściwości
> Sprawdź właściwości komponentu Transform obiektu "TestPlayer"
```

### Testowanie Gry

```bash
# Uruchom tryb Play
> Uruchom tryb Play w Unity

# Przetestuj GameManager
> Wywołaj metodę "StartGame" w GameManager

# Sprawdź stan
> Sprawdź aktualny stan GameManager

# Zatrzymaj tryb Play
> Zatrzymaj tryb Play w Unity
```

### Zarządzanie Prefabami

```bash
# Sprawdź prefaby
> Pokaż mi listę wszystkich prefabów w projekcie

# Utwórz prefab
> Utwórz prefab z obiektu "TestPlayer" i zapisz go jako "PlayerPrefab"

# Załaduj prefab
> Załaduj prefab "PlayerPrefab" na pozycji (10, 0, 5)
```

## 🔧 Konfiguracja

### Konfiguracja Serwera

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

### Auto-Start

```bash
# Uruchom z auto-start
node src/index.js --auto-start

# Lub użyj PowerShell script
./start-mcp-unity.ps1

# W tle
./start-mcp-unity.ps1 -Background
```

## 🔍 Rozwiązywanie Problemów

### Typowe Problemy

1. **TCP Server nie startuje**
   - Sprawdź czy port 6401 jest wolny
   - Sprawdź czy Unity jest uruchomiony
   - Sprawdź logi Unity Console

2. **Błędy kompilacji**
   - Sprawdź czy Unity Bridge jest poprawnie skopiowany
   - Sprawdź czy wszystkie zależności są zainstalowane
   - Sprawdź czy Unity używa .NET Standard 2.1

3. **MCP nie łączy się**
   - Sprawdź konfigurację Claude Code MCP
   - Sprawdź czy serwer Node.js jest uruchomiony
   - Sprawdź logi w konsoli

### Diagnostyka

```bash
# Sprawdź status serwera MCP
claude mcp list

# Sprawdź proces Unity
tasklist | findstr Unity

# Sprawdź port 6401
netstat -an | findstr 6401

# Sprawdź logi Unity
> Sprawdź konsole Unity
```

## 🤝 Wkład w Projekt

Zapraszamy do współpracy! Aby przyczynić się do rozwoju projektu:

1. **Fork** repozytorium
2. **Utwórz branch** dla swojej funkcji
3. **Zaimplementuj** zmiany
4. **Napisz testy** dla nowych funkcji
5. **Utwórz Pull Request**

### Coding Standards

- **C# Unity:** Używaj PascalCase dla metod i właściwości
- **JavaScript:** Używaj camelCase dla zmiennych i funkcji
- **PowerShell:** Używaj PascalCase dla parametrów
- **Dokumentacja:** Zawsze dodawaj komentarze do skomplikowanych funkcji

## 📞 Wsparcie

### Dokumentacja
- **INSTALLATION.md** - Szczegółowa instrukcja instalacji
- **TROUBLESHOOTING.md** - Rozwiązywanie problemów
- **API.md** - Dokumentacja API narzędzi MCP

### Kontakt
- **Email:** wilendar@gmail.com
- **GitHub Issues:** Zgłaszanie problemów
- **GitHub Discussions:** Dyskusje i pytania

## 🏆 Funkcje Zaawansowane

### Auto-Start Monitor
- Automatyczne wykrywanie uruchomienia Unity
- Retry logic przy błędach połączenia
- Monitoring procesów Unity w tle

### Robust Error Handling
- Obsługa ThreadAbortException
- Graceful shutdown TCP connections
- Automatic reconnection przy błędach

### Performance Optimizations
- Connection pooling
- Lazy loading komponentów
- Efficient JSON serialization

## 🔗 Linki

- **Claude Code:** https://claude.ai/code
- **Unity:** https://unity.com/
- **MCP Protocol:** https://spec.modelcontextprotocol.io/

## 👤 Autor

**Kamil Wiliński**
- Doświadczony developer Unity i AI tools
- Specjalista w automatyzacji workflow
- Twórca narzędzi produktywności

## 📄 Licencja

MIT License - szczegóły w pliku LICENSE

---

**Unity MCP Advanced** - Zrewolucjonizuj swój workflow Unity z Claude Code! 🚀

*Wersja: 1.0.0*  
*Data: 2025-07-18*