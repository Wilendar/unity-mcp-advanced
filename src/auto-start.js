#!/usr/bin/env node

/**
 * MCP Unity Advanced - Auto-Start Version
 * Autor: Kamil Wiliński
 * 
 * To jest wersja auto-start, która automatycznie uruchamia serwer MCP
 * gdy Unity jest wykryty. Główny index.js pozostaje w trybie stdio dla Claude Code.
 */

import { spawn, exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AutoStartMCP {
  constructor() {
    this.config = this.loadConfig();
    this.mcpProcess = null;
    this.checking = false;
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, '..', 'config.json');
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
      }
    } catch (error) {
      console.error('[Auto-Start] Failed to load config.json, using defaults');
    }
    
    return {
      settings: {
        checkInterval: 5000,
        retryInterval: 10000,
        logLevel: 'info'
      }
    };
  }

  async checkUnityProcess() {
    return new Promise((resolve) => {
      exec('tasklist /FI "IMAGENAME eq Unity.exe"', (error, stdout, stderr) => {
        if (error) {
          resolve(false);
        } else {
          resolve(stdout.toLowerCase().includes('unity.exe'));
        }
      });
    });
  }

  async startMCPServer() {
    if (this.mcpProcess) {
      console.log('[Auto-Start] MCP server already running');
      return;
    }

    try {
      const mainScript = path.join(__dirname, 'index.js');
      console.log('[Auto-Start] Starting MCP server...');
      
      this.mcpProcess = spawn('node', [mainScript], {
        stdio: 'inherit',
        env: { ...process.env, MCP_AUTO_START: 'false' }
      });

      this.mcpProcess.on('close', (code) => {
        console.log(`[Auto-Start] MCP server exited with code ${code}`);
        this.mcpProcess = null;
        
        // Restart if Unity is still running
        setTimeout(() => this.monitorUnity(), 2000);
      });

      this.mcpProcess.on('error', (error) => {
        console.error('[Auto-Start] MCP server error:', error.message);
        this.mcpProcess = null;
      });

      console.log('[Auto-Start] MCP server started successfully');
    } catch (error) {
      console.error('[Auto-Start] Failed to start MCP server:', error.message);
      this.mcpProcess = null;
    }
  }

  async stopMCPServer() {
    if (this.mcpProcess) {
      console.log('[Auto-Start] Stopping MCP server...');
      this.mcpProcess.kill();
      this.mcpProcess = null;
    }
  }

  async monitorUnity() {
    if (this.checking) return;
    
    this.checking = true;
    
    try {
      const isUnityRunning = await this.checkUnityProcess();
      
      if (isUnityRunning) {
        console.log('[Auto-Start] Unity detected');
        if (!this.mcpProcess) {
          await this.startMCPServer();
        }
      } else {
        console.log('[Auto-Start] Unity not detected');
        if (this.mcpProcess) {
          await this.stopMCPServer();
        }
      }
    } catch (error) {
      console.error('[Auto-Start] Monitor error:', error.message);
    } finally {
      this.checking = false;
    }

    // Schedule next check
    const interval = this.config.settings?.checkInterval || 5000;
    setTimeout(() => this.monitorUnity(), interval);
  }

  async start() {
    console.log('[Auto-Start] Starting Unity Monitor...');
    console.log('[Auto-Start] Check interval:', this.config.settings?.checkInterval || 5000, 'ms');
    
    await this.monitorUnity();
  }

  async stop() {
    console.log('[Auto-Start] Stopping Unity Monitor...');
    await this.stopMCPServer();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Auto-Start] Received SIGINT, shutting down...');
  if (autoStart) {
    await autoStart.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Auto-Start] Received SIGTERM, shutting down...');
  if (autoStart) {
    await autoStart.stop();
  }
  process.exit(0);
});

// Start the auto-start monitor
const autoStart = new AutoStartMCP();
autoStart.start().catch(console.error);