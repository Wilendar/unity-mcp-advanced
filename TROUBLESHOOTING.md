# Unity MCP Advanced - Rozwiązywanie Problemów 🔧

## 🚨 Najczęstsze Problemy

### 1. TCP Server nie startuje

**Objawy:**
- Brak komunikatu w Unity Console: `[Unity TCP Server] Started on port 6401`
- Claude Code nie może połączyć się z Unity
- Błąd: `Connection refused`

**Rozwiązania:**

#### A. Sprawdź port 6401
```bash
# Sprawdź czy port jest zajęty
netstat -an | findstr 6401

# Jeśli port jest zajęty, zamknij proces
taskkill /F /PID [PID_PROCESU]
```

#### B. Sprawdź Unity Console
```bash
# W Unity Console powinna pojawić się wiadomość:
[Unity TCP Server] Initializing TCP server...
[Unity TCP Server] Started on port 6401
```

#### C. Restart Unity
1. Zamknij Unity
2. Usuń folder `Library/ScriptAssemblies/`
3. Uruchom Unity ponownie

### 2. Błędy Kompilacji Unity

**Objawy:**
- Błędy CS w Unity Console
- TCP Server nie startuje
- Brak komunikacji z Claude Code

**Rozwiązania:**

#### A. Sprawdź Unity Bridge
```bash
# Sprawdź czy pliki istnieją
ls Assets/Editor/UnityMcpBridge/
# Powinno być:
# - UnityTcpServer.cs
# - SimpleMcpBridge.cs
```

#### B. Sprawdź .NET Standard
1. Otwórz `Project Settings` → `Player` → `Configuration`
2. Ustaw `Api Compatibility Level` na `.NET Standard 2.1`
3. Restart Unity

#### C. Sprawdź błędy kompilacji
```csharp
// Najczęstsze błędy:
// CS0136: A local variable named 'response' cannot be declared
// - Rozwiązanie: Usuń duplikaty deklaracji zmiennych

// CS0246: The type or namespace name 'X' could not be found
// - Rozwiązanie: Sprawdź using statements
```

### 3. MCP nie łączy się z Unity

**Objawy:**
- Claude Code nie widzi narzędzi Unity
- Błąd: `MCP connection failed`
- Timeout przy próbie komunikacji

**Rozwiązania:**

#### A. Sprawdź konfigurację Claude Code MCP
```bash
# Sprawdź listę serwerów MCP
claude mcp list

# Powinno być:
# unity-mcp-advanced: node path/to/src/index.js
```

#### B. Sprawdź Node.js server
```bash
# Uruchom ręcznie
cd mcp-unity-advanced
node src/index.js

# Sprawdź logi
# Powinno być:
# [MCP] Server starting...
# [MCP] Unity Bridge initialized
```

#### C. Sprawdź zależności
```bash
# Przeinstaluj zależności
cd mcp-unity-advanced
rm -rf node_modules
npm install
```

### 4. ThreadAbortException Errors

**Objawy:**
- Błędy w Unity Console: `Thread was being aborted`
- TCP server crashuje
- Niestabilna komunikacja

**Rozwiązania:**

#### A. Sprawdź kod UnityTcpServer.cs
```csharp
// Powinno być:
catch (Exception ex)
{
    if (isListening && !(ex is ThreadAbortException))
    {
        Debug.LogError($"[Unity TCP Server] Error: {ex.Message}");
    }
}
```

#### B. Graceful shutdown
```csharp
// W StopTcpServer() powinno być:
isListening = false;
if (tcpListenerThread != null && tcpListenerThread.IsAlive)
{
    tcpListenerThread.Join(1000); // Wait max 1 second
}
```

### 5. Auto-Start nie działa

**Objawy:**
- Serwer MCP nie uruchamia się automatycznie
- Brak monitoringu procesu Unity
- PowerShell script nie działa

**Rozwiązania:**

#### A. Sprawdź config.json
```json
{
  "settings": {
    "autoStart": true,
    "checkInterval": 5000,
    "retryInterval": 10000
  }
}
```

#### B. Sprawdź PowerShell execution policy
```powershell
# Sprawdź obecną politykę
Get-ExecutionPolicy

# Ustaw na RemoteSigned
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### C. Uruchom ręcznie
```powershell
# Uruchom z auto-start
./start-mcp-unity.ps1

# Lub bezpośrednio
node src/index.js --auto-start
```

## 🔍 Diagnostyka Krok Po Kroku

### Krok 1: Sprawdź Podstawowe Komponenty

```bash
# 1. Sprawdź Unity
tasklist | findstr Unity

# 2. Sprawdź Node.js
node --version

# 3. Sprawdź port 6401
netstat -an | findstr 6401

# 4. Sprawdź Claude Code MCP
claude mcp list
```

### Krok 2: Sprawdź Logi

```bash
# Unity Console
> Sprawdź konsole Unity

# Node.js logs
cd mcp-unity-advanced
node src/index.js --debug

# PowerShell logs
Get-Content auto-start.log -Tail 20
```

### Krok 3: Test Komunikacji

```bash
# Test TCP connection
telnet localhost 6401

# Test MCP tools
> Sprawdź błędy kompilacji Unity

# Test ping
echo "ping" | nc localhost 6401
```

## 🛠️ Narzędzia Diagnostyczne

### Unity Console Commands

```csharp
// Sprawdź TCP Server status
Debug.Log($"[Unity TCP Server] Status: {(isListening ? "Running" : "Stopped")}");

// Sprawdź connected clients
Debug.Log($"[Unity TCP Server] Connected clients: {connectedClients.Count}");

// Test communication
Debug.Log("[Unity TCP Server] Test message");
```

### Node.js Debug Commands

```javascript
// Sprawdź połączenie z Unity
console.log('[MCP] Testing Unity connection...');

// Sprawdź dostępne narzędzia
console.log('[MCP] Available tools:', Object.keys(tools));

// Test TCP connection
const net = require('net');
const client = new net.Socket();
client.connect(6401, 'localhost', () => {
    console.log('[MCP] Connected to Unity TCP Server');
});
```

### PowerShell Debug Commands

```powershell
# Sprawdź proces Unity
Get-Process Unity -ErrorAction SilentlyContinue

# Sprawdź port
Get-NetTCPConnection -LocalPort 6401 -ErrorAction SilentlyContinue

# Test network connectivity
Test-NetConnection localhost -Port 6401
```

## 🔄 Procedury Naprawy

### Procedura 1: Pełny Restart

```bash
# 1. Zatrzymaj wszystkie procesy
taskkill /F /IM Unity.exe
taskkill /F /IM node.exe

# 2. Wyczyść cache
rm -rf Library/ScriptAssemblies/
rm -rf mcp-unity-advanced/node_modules/

# 3. Przeinstaluj zależności
cd mcp-unity-advanced
npm install

# 4. Uruchom Unity
# 5. Uruchom MCP server
node src/index.js

# 6. Test komunikacji
claude
> Sprawdź konsole Unity
```

### Procedura 2: Napraw Błędy Kompilacji

```bash
# 1. Sprawdź błędy
> Sprawdź błędy kompilacji Unity

# 2. Otwórz problematyczne pliki
# 3. Usuń duplikaty deklaracji zmiennych
# 4. Sprawdź using statements
# 5. Restart Unity

# 6. Potwierdź naprawę
> Sprawdź błędy kompilacji Unity
```

### Procedura 3: Napraw MCP Connection

```bash
# 1. Sprawdź konfigurację
claude mcp list

# 2. Usuń i dodaj ponownie
claude mcp remove unity-mcp-advanced
claude mcp add unity-mcp-advanced "node path/to/src/index.js"

# 3. Restart Claude Code
# 4. Test komunikacji
> Sprawdź konsole Unity
```

## 📋 Lista Kontrolna Problemów

### ✅ Przed Zgłoszeniem Problemu

- [ ] Sprawdziłem Unity Console na błędy
- [ ] Sprawdziłem czy port 6401 jest wolny
- [ ] Sprawdziłem konfigurację Claude Code MCP
- [ ] Sprawdziłem czy Node.js server działa
- [ ] Sprawdziłem logi PowerShell
- [ ] Próbowałem pełnego restartu
- [ ] Sprawdziłem czy wszystkie pliki są na swoim miejscu

### ✅ Informacje do Zgłoszenia

- [ ] Wersja Unity
- [ ] Wersja Node.js
- [ ] Wersja Claude Code
- [ ] System operacyjny
- [ ] Pełny komunikat błędu
- [ ] Kroki do reprodukcji problemu
- [ ] Logi Unity Console
- [ ] Logi Node.js
- [ ] Konfiguracja MCP

## 🔗 Zasoby

### Dokumentacja
- **INSTALLATION.md** - Instrukcja instalacji
- **README.md** - Dokumentacja główna
- **API.md** - Dokumentacja API

### Wsparcie
- **GitHub Issues** - Zgłaszanie problemów
- **GitHub Discussions** - Pytania i dyskusje
- **Email:** wilendar@gmail.com

### Społeczność
- **Discord** - Społeczność Unity MCP
- **Reddit** - r/Unity3D
- **Stack Overflow** - Pytania techniczne

## 👤 Autor

**Kamil Wiliński**
- Doświadczony developer Unity i AI tools
- Specjalista w rozwiązywaniu problemów integracji
- Twórca narzędzi produktywności

---

**Jeśli problem nadal występuje, utwórz issue na GitHub z pełnymi logami i krokami do reprodukcji!** 🚀

*Wersja: 1.0.0*  
*Data: 2025-07-18*