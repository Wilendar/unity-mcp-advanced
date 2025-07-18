/**
 * Unity Bridge - Komunikacja z Unity Editor przez socket
 * Autor: Kamil Wiliński
 * 
 * Wykorzystuje ten sam system co unity-mcp dla spójności
 */

import net from 'net';
import fs from 'fs';
import path from 'path';

class UnityBridge {
  constructor() {
    this.host = 'localhost';
    this.port = 6401;
    this.socket = null;
    this.connected = false;
    this.connectionTimeout = 86400000; // 24 godziny
    this.bufferSize = 16 * 1024 * 1024; // 16MB
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  /**
   * Nawiązuje połączenie z Unity Editor
   */
  async connect() {
    if (this.connected && this.socket) {
      try {
        // Sprawdź czy połączenie jest nadal aktywne
        await this.ping();
        return true;
      } catch (error) {
        console.log(`[Unity Bridge] Istniejące połączenie nieaktywne: ${error.message}`);
        this.disconnect();
      }
    }

    return new Promise((resolve, reject) => {
      console.log(`[Unity Bridge] Łączenie z Unity na ${this.host}:${this.port}`);
      
      this.socket = new net.Socket();
      this.socket.setTimeout(this.connectionTimeout);
      
      this.socket.on('connect', () => {
        console.log(`[Unity Bridge] Połączono z Unity na ${this.host}:${this.port}`);
        this.connected = true;
        this.retryCount = 0;
        resolve(true);
      });
      
      this.socket.on('error', (error) => {
        console.error(`[Unity Bridge] Błąd połączenia: ${error.message}`);
        this.connected = false;
        this.socket = null;
        
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          console.log(`[Unity Bridge] Próba ponownego połączenia ${this.retryCount}/${this.maxRetries} za ${this.retryDelay}ms`);
          setTimeout(() => {
            this.connect().then(resolve).catch(reject);
          }, this.retryDelay);
        } else {
          reject(new Error(`Nie można połączyć z Unity po ${this.maxRetries} próbach: ${error.message}`));
        }
      });
      
      this.socket.on('close', () => {
        console.log(`[Unity Bridge] Połączenie zamknięte`);
        this.connected = false;
        this.socket = null;
      });
      
      this.socket.on('timeout', () => {
        console.error(`[Unity Bridge] Timeout połączenia`);
        this.disconnect();
        reject(new Error('Timeout połączenia z Unity'));
      });
      
      this.socket.connect(this.port, this.host);
    });
  }

  /**
   * Zamyka połączenie z Unity
   */
  disconnect() {
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch (error) {
        console.error(`[Unity Bridge] Błąd podczas zamykania: ${error.message}`);
      }
      this.socket = null;
    }
    this.connected = false;
  }

  /**
   * Otrzymuje pełną odpowiedź z Unity, obsługując fragmenty danych
   */
  async receiveFullResponse(socket, bufferSize = this.bufferSize) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      const timeout = setTimeout(() => {
        const currentData = Buffer.concat(chunks).toString('utf-8');
        console.error(`[Unity Bridge] Timeout po 30s. Zebrane dane (${currentData.length} znaków): ${currentData.substring(0, 200)}...`);
        reject(new Error('Timeout podczas odbioru odpowiedzi'));
      }, 30000);

      const onData = (chunk) => {
        chunks.push(chunk);
        
        // Sprawdź czy mamy kompletną odpowiedź
        const data = Buffer.concat(chunks);
        const decodedData = data.toString('utf-8');
        
        try {
          // Specjalny przypadek dla ping-pong
          if (decodedData.trim().startsWith('{"status":"success","result":{"message":"pong"')) {
            clearTimeout(timeout);
            socket.removeListener('data', onData);
            resolve(data);
            return;
          }
          
          // Sprawdź poprawność JSON bezpośrednio
          JSON.parse(decodedData);
          
          // Jeśli dotarliśmy tutaj, mamy poprawny JSON
          console.log(`[Unity Bridge] Odebrano kompletną odpowiedź (${data.length} bajtów)`);
          clearTimeout(timeout);
          socket.removeListener('data', onData);
          resolve(data);
        } catch (jsonError) {
          // Nie mamy jeszcze kompletnej odpowiedzi JSON
          // Kontynuuj czytanie
          console.log(`[Unity Bridge] Czekanie na więcej danych... (${data.length} bajtów, błąd: ${jsonError.message})`);
        }
      };

      socket.on('data', onData);
      
      socket.on('error', (error) => {
        clearTimeout(timeout);
        socket.removeListener('data', onData);
        reject(error);
      });
      
      socket.on('close', () => {
        clearTimeout(timeout);
        socket.removeListener('data', onData);
        if (chunks.length === 0) {
          reject(new Error('Połączenie zamknięte przed otrzymaniem danych'));
        }
      });
    });
  }

  /**
   * Wysyła komendę do Unity i zwraca odpowiedź
   */
  async sendCommand(commandType, params = {}) {
    if (!this.connected && !await this.connect()) {
      throw new Error('Brak połączenia z Unity');
    }

    // Specjalna obsługa komendy ping
    if (commandType === 'ping') {
      return new Promise((resolve, reject) => {
        console.log(`[Unity Bridge] Wysyłanie ping`);
        
        const timeout = setTimeout(() => {
          reject(new Error('Timeout ping'));
        }, 5000);

        this.socket.write('ping');
        
        this.receiveFullResponse(this.socket)
          .then(responseData => {
            clearTimeout(timeout);
            const response = JSON.parse(responseData.toString('utf-8'));
            
            if (response.status !== 'success') {
              console.warn(`[Unity Bridge] Ping nie powiódł się`);
              this.connected = false;
              this.socket = null;
              reject(new Error('Weryfikacja połączenia nie powiodła się'));
              return;
            }
            
            resolve({ message: 'pong' });
          })
          .catch(error => {
            clearTimeout(timeout);
            console.error(`[Unity Bridge] Błąd ping: ${error.message}`);
            this.connected = false;
            this.socket = null;
            reject(new Error(`Weryfikacja połączenia nie powiodła się: ${error.message}`));
          });
      });
    }

    // Normalna obsługa komend
    const command = {
      type: commandType,
      params: params || {}
    };

    return new Promise((resolve, reject) => {
      try {
        const commandJson = JSON.stringify(command, null, 0);
        const commandSize = Buffer.byteLength(commandJson, 'utf-8');
        
        if (commandSize > this.bufferSize / 2) {
          console.warn(`[Unity Bridge] Duża komenda wykryta (${commandSize} bajtów)`);
        }
        
        console.log(`[Unity Bridge] Wysyłanie komendy: ${commandType} (${commandSize} bajtów)`);
        
        this.socket.write(commandJson);
        
        this.receiveFullResponse(this.socket)
          .then(responseData => {
            try {
              const response = JSON.parse(responseData.toString('utf-8'));
              
              if (response.status === 'error') {
                const errorMessage = response.error || response.message || 'Nieznany błąd Unity';
                console.error(`[Unity Bridge] Błąd Unity: ${errorMessage}`);
                reject(new Error(errorMessage));
                return;
              }
              
              resolve(response.result || {});
            } catch (jsonError) {
              console.error(`[Unity Bridge] Błąd parsowania JSON: ${jsonError.message}`);
              const partialResponse = responseData.toString('utf-8').substring(0, 500);
              console.error(`[Unity Bridge] Częściowa odpowiedź: ${partialResponse}...`);
              reject(new Error(`Nieprawidłowa odpowiedź JSON z Unity: ${jsonError.message}`));
            }
          })
          .catch(error => {
            console.error(`[Unity Bridge] Błąd komunikacji z Unity: ${error.message}`);
            this.connected = false;
            this.socket = null;
            reject(new Error(`Komunikacja z Unity nie powiodła się: ${error.message}`));
          });
      } catch (error) {
        console.error(`[Unity Bridge] Błąd wysyłania komendy: ${error.message}`);
        this.connected = false;
        this.socket = null;
        reject(new Error(`Wysyłanie komendy nie powiodło się: ${error.message}`));
      }
    });
  }

  /**
   * Sprawdza połączenie z Unity
   */
  async ping() {
    try {
      const result = await this.sendCommand('ping');
      return result.message === 'pong';
    } catch (error) {
      throw new Error(`Ping nie powiódł się: ${error.message}`);
    }
  }

  /**
   * Sprawdza czy Unity jest uruchomione
   */
  async isUnityRunning() {
    try {
      await this.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Globalna instancja Unity Bridge
let _unityBridge = null;

/**
 * Pobiera lub tworzy instancję Unity Bridge
 */
export function getUnityBridge() {
  if (_unityBridge === null) {
    console.log(`[Unity Bridge] Tworzenie nowej instancji Unity Bridge`);
    _unityBridge = new UnityBridge();
  }
  
  return _unityBridge;
}

/**
 * Resetuje połączenie Unity Bridge
 */
export function resetUnityBridge() {
  if (_unityBridge) {
    _unityBridge.disconnect();
    _unityBridge = null;
  }
}

export default UnityBridge;