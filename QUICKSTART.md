# Unity MCP Advanced - Szybki Start ⚡

## 🎯 W 5 Minut Do Działania

### Krok 1: Klonuj i Zainstaluj (2 min)
```bash
git clone https://github.com/wilendar/unity-mcp-advanced.git
cd unity-mcp-advanced/mcp-unity-advanced
npm install
```

### Krok 2: Dodaj do Unity (1 min)
```bash
# Skopiuj folder do swojego projektu Unity
cp -r ../UnityMcpBridge YourProject/Assets/Editor/
```

### Krok 3: Skonfiguruj Claude Code (1 min)
```bash
claude mcp add unity-mcp-advanced "node /path/to/unity-mcp-advanced/mcp-unity-advanced/src/index.js"
```

### Krok 4: Uruchom i Testuj (1 min)
```bash
# Uruchom Unity z projektem
# Uruchom Claude Code
claude

# Testuj komunikację
> Sprawdź konsole Unity
```

## ✅ Weryfikacja Instalacji

Po instalacji powinieneś zobaczyć:

### W Unity Console:
```
[Unity TCP Server] Initializing TCP server...
[Unity TCP Server] Started on port 6401
```

### W Claude Code:
```bash
> Sprawdź błędy kompilacji Unity
# Powinno zwrócić: "✅ Brak błędów kompilacji!"
```

## 🚀 Pierwsze Komendy

```bash
# Podstawowe debugowanie
> Sprawdź konsole Unity
> Sprawdź błędy kompilacji Unity
> Wymuś focus okna Unity

# Zarządzanie obiektami
> Pokaż obiekty w hierarchii Unity
> Utwórz nowy GameObject "TestObject"
> Dodaj komponent Rigidbody do "TestObject"

# Kontrola Play Mode
> Uruchom tryb Play w Unity
> Sprawdź status trybu Play
> Zatrzymaj tryb Play

# Zarządzanie prefabami
> Pokaż listę prefabów w projekcie
> Utwórz prefab z obiektu "TestObject"
```

## 🔧 Najczęstsze Problemy

### Problem: TCP Server nie startuje
**Rozwiązanie:**
```bash
# Sprawdź port 6401
netstat -an | findstr 6401

# Restart Unity
# Sprawdź Unity Console na błędy
```

### Problem: MCP nie łączy się
**Rozwiązanie:**
```bash
# Sprawdź konfigurację
claude mcp list

# Sprawdź czy Node.js server działa
cd mcp-unity-advanced
node src/index.js
```

### Problem: Błędy kompilacji
**Rozwiązanie:**
```bash
# Sprawdź czy Unity Bridge jest poprawnie skopiowany
ls Assets/Editor/UnityMcpBridge/

# Sprawdź .NET Standard 2.1 w Project Settings
```

## 📚 Pełna Dokumentacja

- **README.md** - Kompletna dokumentacja
- **INSTALLATION.md** - Szczegółowa instalacja
- **TROUBLESHOOTING.md** - Rozwiązywanie problemów

## 🎉 Gotowe!

Teraz możesz zarządzać Unity bezpośrednio z Claude Code! 🚀

---

*Problemy? Sprawdź TROUBLESHOOTING.md lub utwórz issue na GitHub*