# MCP Unity Advanced z Unity Bridge

## Przegląd

MCP Unity Advanced został zmodyfikowany, aby używać tego samego Unity Bridge co unity-mcp, zapewniając spójność i lepszą komunikację z Unity Editor.

## Architektura

### Unity Bridge (unity-bridge.js)
- **Komunikacja Socket**: Używa TCP socket (port 6401) dla komunikacji z Unity
- **Automatyczne retry**: Obsługuje błędy połączenia i automatycznie próbuje ponownie
- **Ping/Pong**: Weryfikuje połączenie z Unity
- **Chunked responses**: Obsługuje duże odpowiedzi od Unity

### Hybrid System - Bridge + PowerShell Fallback
Wszystkie główne funkcje mają teraz podwójny system:
1. **Primary**: Unity Bridge (dla prawdziwej komunikacji z Unity)
2. **Fallback**: PowerShell (dla podstawowych operacji gdy Bridge nie działa)

## Zmodyfikowane Metody

### 1. focusUnityWindow()
- **Primary**: `unityBridge.sendCommand('focus_window')`
- **Fallback**: PowerShell `AppActivate` 
- **Benefit**: Prawdziwa komunikacja z Unity zamiast symulacji

### 2. startPlayMode()
- **Primary**: `unityBridge.sendCommand('start_play_mode')`
- **Fallback**: PowerShell `Ctrl+P`
- **Benefit**: Bezpośrednie wywoływanie Unity API

### 3. stopPlayMode()
- **Primary**: `unityBridge.sendCommand('stop_play_mode')`
- **Fallback**: PowerShell `Ctrl+P`
- **Benefit**: Bezpośrednie wywoływanie Unity API

### 4. readUnityConsole()
- **Primary**: `unityBridge.sendCommand('read_console')`
- **Fallback**: Odczyt z plików logów
- **Benefit**: Realtime console access

## Konfiguracja

### Unity Bridge Settings
```javascript
this.host = 'localhost';
this.port = 6401;
this.connectionTimeout = 86400000; // 24 godziny
this.bufferSize = 16 * 1024 * 1024; // 16MB
this.maxRetries = 3;
this.retryDelay = 1000;
```

### Wymagania
1. **Unity MCP Bridge**: Musi być uruchomiony w Unity Editor
2. **Socket Server**: Unity musi nasłuchiwać na porcie 6401
3. **Fallback Support**: PowerShell musi być dostępny dla fallback

## Zalety Nowej Architektury

### 1. Spójność z unity-mcp
- Używa tej samej komunikacji socket
- Identyczne protokoły komunikacyjne
- Wspólna baza kodu dla Bridge

### 2. Niezawodność
- Automatyczne fallback gdy Bridge nie działa
- Retry logic dla połączeń
- Graceful degradation do PowerShell

### 3. Wydajność
- Bezpośrednia komunikacja z Unity API
- Brak symulacji klawiszy
- Realtime data access

### 4. Rozszerzalność
- Łatwe dodawanie nowych komend
- Wspólny interface dla wszystkich operacji
- Consistent error handling

## Użycie

### Inicjalizacja
```javascript
// Automatycznie inicjalizowane w konstruktorze
this.unityBridge = getUnityBridge();
```

### Sprawdzanie statusu
```javascript
const isRunning = await this.unityBridge.isUnityRunning();
```

### Wysyłanie komend
```javascript
const result = await this.unityBridge.sendCommand('command_name', params);
```

## Debugging

### Logi Unity Bridge
```
[Unity Bridge] Łączenie z Unity na localhost:6401
[Unity Bridge] Połączono z Unity na localhost:6401
[Unity Bridge] Wysyłanie komendy: start_play_mode (234 bajtów)
[Unity Bridge] Odebrano kompletną odpowiedź (567 bajtów)
```

### Fallback Warnings
```
[MCP Unity Advanced] Unity Bridge nie działa, używam PowerShell fallback: Connection refused
```

## Testowanie

### Test Unity Bridge
```bash
# Sprawdź czy Unity Bridge działa
echo '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "focus_unity_window", "arguments": {}}, "id": 1}' | node src/index.js
```

### Test Fallback
```bash
# Zatrzymaj Unity Bridge i sprawdź fallback
# Powinno pokazać "(PowerShell fallback)" w odpowiedzi
```

## Kompatybilność

- **Unity 2021.3+**: Pełna kompatybilność
- **MCP SDK**: Najnowsza wersja
- **Node.js**: 16+
- **PowerShell**: 5.1+ (dla fallback)

## Autor

**Kamil Wiliński**  
**Data**: 17.07.2025  
**Wersja**: 1.0 - Integracja z Unity Bridge