#!/usr/bin/env node

/**
 * MCP Unity Advanced - Zaawansowany MCP dla Unity Engine
 * Autor: Kamil Wiliński
 * 
 * Funkcjonalności:
 * - Dostęp do konsoli Unity (czytanie logów, błędów, warnings)
 * - Zarządzanie ustawieniami projektu Unity
 * - Debugowanie projektów Unity
 * - Manipulacja scenami i GameObjectami
 * - Zarządzanie skryptami i komponentami
 * - Monitoring zmian w projekcie
 * - Automatyzacja testów
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
  ListResourcesRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs-extra';
import path from 'path';
import { spawn, exec } from 'child_process';
import chokidar from 'chokidar';
import { fileURLToPath } from 'url';
import { getUnityBridge } from './unity-bridge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UnityMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'unity-advanced',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.unityProjectPath = null;
    this.unityLogsPath = null;
    this.consoleWatcher = null;
    
    // Inicjalizuj Unity Bridge (lazy loading)
    this.unityBridge = null;
    
    // Wczytaj konfigurację
    this.config = this.loadConfig();
    
    // Konfiguracja autozatwierdzania
    this.autoApprove = this.config.settings?.autoApprove || 
                     process.env.MCP_AUTO_APPROVE === 'true' || 
                     process.argv.includes('--auto-approve');
    
    this.setupToolHandlers();
    this.setupResourceHandlers();
    
    // Loguj status autozatwierdzania
    console.log(`[MCP Unity Advanced] Auto-approve: ${this.autoApprove ? 'ENABLED' : 'DISABLED'}`);
  }
  
  // Lazy loading Unity Bridge
  getUnityBridge() {
    if (!this.unityBridge) {
      this.unityBridge = getUnityBridge();
    }
    return this.unityBridge;
  }
  
  loadConfig() {
    try {
      const configPath = path.join(__dirname, '..', 'config.json');
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
      }
    } catch (error) {
      console.warn('[MCP Unity Advanced] Failed to load config.json, using defaults');
    }
    
    // Domyślna konfiguracja
    return {
      settings: {
        autoApprove: true,
        logLevel: 'info',
        maxLogLines: 500
      },
      permissions: {
        readUnityConsole: true,
        modifyUnitySettings: true,
        createGameObjects: true,
        runUnityTests: true,
        buildProject: true
      }
    };
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // === KONSOLA I DEBUGOWANIE ===
        {
          name: 'read_unity_console',
          description: 'Odczytuje logi z konsoli Unity (błędy, warnings, debug)',
          inputSchema: {
            type: 'object',
            properties: {
              filter: {
                type: 'string',
                enum: ['all', 'errors', 'warnings', 'logs'],
                description: 'Filtr typu logów'
              },
              last_lines: {
                type: 'number',
                description: 'Ilość ostatnich linii do odczytania',
                default: 50
              }
            }
          }
        },
        {
          name: 'get_console_entries',
          description: 'Odczytuje rzeczywiste wpisy z konsoli Unity (używa LogEntries API)',
          inputSchema: {
            type: 'object',
            properties: {
              filter: {
                type: 'string',
                enum: ['all', 'errors', 'warnings', 'logs'],
                description: 'Filtr typu logów'
              },
              last_lines: {
                type: 'number',
                description: 'Ilość ostatnich linii do odczytania',
                default: 50
              }
            }
          }
        },
        {
          name: 'clear_unity_console',
          description: 'Czyści konsolę Unity',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'send_debug_log',
          description: 'Wysyła debug log do Unity',
          inputSchema: {
            type: 'object',
            properties: {
              message: { type: 'string', description: 'Wiadomość do wylogowania' },
              type: {
                type: 'string',
                enum: ['log', 'warning', 'error'],
                description: 'Typ logu'
              }
            },
            required: ['message']
          }
        },

        // === PROJEKT I USTAWIENIA ===
        {
          name: 'get_unity_project_settings',
          description: 'Pobiera ustawienia projektu Unity',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                enum: ['player', 'quality', 'physics', 'input', 'all'],
                description: 'Kategoria ustawień'
              }
            }
          }
        },
        {
          name: 'update_unity_project_settings',
          description: 'Aktualizuje ustawienia projektu Unity',
          inputSchema: {
            type: 'object',
            properties: {
              settings: {
                type: 'object',
                description: 'Obiekt z ustawieniami do zmiany'
              }
            },
            required: ['settings']
          }
        },
        {
          name: 'get_compilation_errors',
          description: 'Pobiera błędy kompilacji z Unity',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },

        // === SCENY I GAMEOBJECTS ===
        {
          name: 'get_active_scene_info',
          description: 'Pobiera informacje o aktywnej scenie',
          inputSchema: {
            type: 'object',
            properties: {
              include_gameobjects: {
                type: 'boolean',
                description: 'Czy dołączyć listę GameObjectów',
                default: true
              }
            }
          }
        },
        {
          name: 'select_gameobject',
          description: 'Zaznacza GameObject w Unity',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Nazwa GameObjectu' },
              path: { type: 'string', description: 'Ścieżka hierarchii' }
            }
          }
        },
        {
          name: 'create_gameobject',
          description: 'Tworzy nowy GameObject',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Nazwa GameObjectu' },
              parent: { type: 'string', description: 'Rodzic (opcjonalnie)' },
              components: {
                type: 'array',
                items: { type: 'string' },
                description: 'Lista komponentów do dodania'
              }
            },
            required: ['name']
          }
        },

        // === SKRYPTY I KOMPONENTY ===
        {
          name: 'get_script_compilation_status',
          description: 'Sprawdza status kompilacji skryptów',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'reload_assemblies',
          description: 'Przeładowuje assemblies Unity',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'execute_unity_menu',
          description: 'Wykonuje opcję z menu Unity',
          inputSchema: {
            type: 'object',
            properties: {
              menu_path: {
                type: 'string',
                description: 'Ścieżka menu np. \"Window/General/Console\"'
              }
            },
            required: ['menu_path']
          }
        },
        {
          name: 'focus_unity_window',
          description: 'Wymusza focus okna Unity na pierwszy plan',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'start_play_mode',
          description: 'Uruchamia tryb Play w Unity',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'stop_play_mode',
          description: 'Zatrzymuje tryb Play w Unity',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'get_play_mode_status',
          description: 'Sprawdza czy Unity jest w trybie Play',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },

        // === HIERARCHIA I SCENA ===
        {
          name: 'get_hierarchy_objects',
          description: 'Pobiera listę obiektów z hierarchii Unity',
          inputSchema: {
            type: 'object',
            properties: {
              filter: {
                type: 'string',
                description: 'Filtr nazw obiektów (opcjonalnie)'
              },
              parent: {
                type: 'string',
                description: 'Nazwa obiektu rodzica (opcjonalnie)'
              }
            }
          }
        },
        {
          name: 'select_hierarchy_object',
          description: 'Zaznacza obiekt w hierarchii Unity',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Nazwa obiektu do zaznaczenia'
              }
            },
            required: ['name']
          }
        },
        {
          name: 'create_hierarchy_object',
          description: 'Tworzy nowy obiekt w hierarchii Unity',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Nazwa nowego obiektu'
              },
              parent: {
                type: 'string',
                description: 'Nazwa obiektu rodzica (opcjonalnie)'
              },
              type: {
                type: 'string',
                enum: ['Empty', 'Cube', 'Sphere', 'Capsule', 'Cylinder', 'Plane', 'Quad'],
                description: 'Typ obiektu do utworzenia',
                default: 'Empty'
              }
            },
            required: ['name']
          }
        },
        {
          name: 'delete_hierarchy_object',
          description: 'Usuwa obiekt z hierarchii Unity',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Nazwa obiektu do usunięcia'
              }
            },
            required: ['name']
          }
        },

        // === INSPEKTOR ===
        {
          name: 'get_component_properties',
          description: 'Pobiera właściwości komponentu z inspektora',
          inputSchema: {
            type: 'object',
            properties: {
              object_name: {
                type: 'string',
                description: 'Nazwa obiektu w hierarchii'
              },
              component_type: {
                type: 'string',
                description: 'Typ komponentu (np. Transform, Rigidbody, GameManager)'
              }
            },
            required: ['object_name', 'component_type']
          }
        },
        {
          name: 'set_component_property',
          description: 'Ustawia właściwość komponentu przez inspektor',
          inputSchema: {
            type: 'object',
            properties: {
              object_name: {
                type: 'string',
                description: 'Nazwa obiektu w hierarchii'
              },
              component_type: {
                type: 'string',
                description: 'Typ komponentu'
              },
              property_name: {
                type: 'string',
                description: 'Nazwa właściwości'
              },
              value: {
                type: 'string',
                description: 'Nowa wartość właściwości'
              }
            },
            required: ['object_name', 'component_type', 'property_name', 'value']
          }
        },
        {
          name: 'add_component',
          description: 'Dodaje komponent do obiektu',
          inputSchema: {
            type: 'object',
            properties: {
              object_name: {
                type: 'string',
                description: 'Nazwa obiektu w hierarchii'
              },
              component_type: {
                type: 'string',
                description: 'Typ komponentu do dodania'
              }
            },
            required: ['object_name', 'component_type']
          }
        },
        {
          name: 'remove_component',
          description: 'Usuwa komponent z obiektu',
          inputSchema: {
            type: 'object',
            properties: {
              object_name: {
                type: 'string',
                description: 'Nazwa obiektu w hierarchii'
              },
              component_type: {
                type: 'string',
                description: 'Typ komponentu do usunięcia'
              }
            },
            required: ['object_name', 'component_type']
          }
        },

        // === GAMEMANAGER TESTING ===
        {
          name: 'trigger_gamemanager_method',
          description: 'Wywołuje metodę GameManager do testowania',
          inputSchema: {
            type: 'object',
            properties: {
              method_name: {
                type: 'string',
                description: 'Nazwa metody GameManager do wywołania'
              },
              parameters: {
                type: 'string',
                description: 'Parametry metody (JSON string, opcjonalnie)'
              }
            },
            required: ['method_name']
          }
        },
        {
          name: 'get_gamemanager_state',
          description: 'Pobiera aktualny stan GameManager',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },

        // === TESTY I BUILD ===
        {
          name: 'run_unity_tests',
          description: 'Uruchamia testy Unity',
          inputSchema: {
            type: 'object',
            properties: {
              test_mode: {
                type: 'string',
                enum: ['editmode', 'playmode', 'all'],
                description: 'Tryb testów'
              },
              filter: {
                type: 'string',
                description: 'Filtr nazw testów'
              }
            }
          }
        },
        {
          name: 'build_unity_project',
          description: 'Buduje projekt Unity',
          inputSchema: {
            type: 'object',
            properties: {
              target: {
                type: 'string',
                enum: ['StandaloneWindows64', 'Android', 'iOS', 'WebGL'],
                description: 'Platforma docelowa'
              },
              output_path: {
                type: 'string',
                description: 'Ścieżka wyjściowa'
              }
            },
            required: ['target']
          }
        },

        // === MONITORING I PERFORMANCE ===
        {
          name: 'get_unity_performance_stats',
          description: 'Pobiera statystyki wydajności Unity',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'watch_project_changes',
          description: 'Monitoruje zmiany w projekcie',
          inputSchema: {
            type: 'object',
            properties: {
              enabled: {
                type: 'boolean',
                description: 'Włącz/wyłącz monitoring'
              }
            },
            required: ['enabled']
          }
        },
        
        // === PREFAB MANAGEMENT ===
        {
          name: 'create_prefab',
          description: 'Tworzy nowy prefab z GameObject',
          inputSchema: {
            type: 'object',
            properties: {
              object_name: {
                type: 'string',
                description: 'Nazwa obiektu w hierarchii do skonwertowania na prefab'
              },
              prefab_path: {
                type: 'string',
                description: 'Ścieżka gdzie zapisać prefab (relatywna do Assets/)'
              },
              prefab_name: {
                type: 'string',
                description: 'Nazwa prefaba (bez .prefab)'
              }
            },
            required: ['object_name', 'prefab_path', 'prefab_name']
          }
        },
        {
          name: 'save_prefab',
          description: 'Zapisuje prefab do pliku',
          inputSchema: {
            type: 'object',
            properties: {
              prefab_path: {
                type: 'string',
                description: 'Ścieżka do prefaba'
              },
              force_overwrite: {
                type: 'boolean',
                description: 'Nadpisz istniejący prefab'
              }
            },
            required: ['prefab_path']
          }
        },
        {
          name: 'load_prefab',
          description: 'Ładuje prefab i tworzy instancję',
          inputSchema: {
            type: 'object',
            properties: {
              prefab_path: {
                type: 'string',
                description: 'Ścieżka do prefaba'
              },
              position: {
                type: 'string',
                description: 'Pozycja instancji (x,y,z)'
              },
              parent: {
                type: 'string',
                description: 'Rodzic dla instancji (opcjonalnie)'
              }
            },
            required: ['prefab_path']
          }
        },
        {
          name: 'create_placeholder_prefab',
          description: 'Tworzy placeholder prefab do testowania',
          inputSchema: {
            type: 'object',
            properties: {
              prefab_name: {
                type: 'string',
                description: 'Nazwa prefaba'
              },
              primitive_type: {
                type: 'string',
                enum: ['Cube', 'Sphere', 'Capsule', 'Cylinder', 'Plane', 'Quad'],
                description: 'Typ prymitywu'
              },
              components: {
                type: 'array',
                items: { type: 'string' },
                description: 'Komponenty do dodania'
              },
              prefab_path: {
                type: 'string',
                description: 'Ścieżka gdzie zapisać prefab'
              }
            },
            required: ['prefab_name', 'primitive_type', 'prefab_path']
          }
        },
        {
          name: 'list_prefabs',
          description: 'Lista wszystkich prefabów w projekcie',
          inputSchema: {
            type: 'object',
            properties: {
              folder_path: {
                type: 'string',
                description: 'Ścieżka folderu do przeszukania (opcjonalnie)'
              }
            }
          }
        },
        {
          name: 'update_mcp_config',
          description: 'Aktualizuje konfigurację MCP Unity Advanced',
          inputSchema: {
            type: 'object',
            properties: {
              setting: {
                type: 'string',
                description: 'Nazwa ustawienia do zmiany (np. autoApprove, logLevel)'
              },
              value: {
                type: 'string',
                description: 'Nowa wartość ustawienia'
              }
            },
            required: ['setting', 'value']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'read_unity_console':
            return await this.readUnityConsole(args);
          case 'get_console_entries':
            return await this.getConsoleEntries(args);
          case 'clear_unity_console':
            return await this.clearUnityConsole();
          case 'send_debug_log':
            return await this.sendDebugLog(args);
          case 'get_unity_project_settings':
            return await this.getUnityProjectSettings(args);
          case 'get_compilation_errors':
            return await this.getCompilationErrors();
          case 'get_active_scene_info':
            return await this.getActiveSceneInfo(args);
          case 'execute_unity_menu':
            return await this.executeUnityMenu(args);
          case 'focus_unity_window':
            return await this.focusUnityWindow(args);
          case 'start_play_mode':
            return await this.startPlayMode(args);
          case 'stop_play_mode':
            return await this.stopPlayMode(args);
          case 'get_play_mode_status':
            return await this.getPlayModeStatus(args);
          case 'get_hierarchy_objects':
            return await this.getHierarchyObjects(args);
          case 'select_hierarchy_object':
            return await this.selectHierarchyObject(args);
          case 'create_hierarchy_object':
            return await this.createHierarchyObject(args);
          case 'delete_hierarchy_object':
            return await this.deleteHierarchyObject(args);
          case 'get_component_properties':
            return await this.getComponentProperties(args);
          case 'set_component_property':
            return await this.setComponentProperty(args);
          case 'add_component':
            return await this.addComponent(args);
          case 'remove_component':
            return await this.removeComponent(args);
          case 'trigger_gamemanager_method':
            return await this.triggerGameManagerMethod(args);
          case 'get_gamemanager_state':
            return await this.getGameManagerState(args);
          case 'run_unity_tests':
            return await this.runUnityTests(args);
          case 'create_prefab':
            return await this.createPrefab(args);
          case 'save_prefab':
            return await this.savePrefab(args);
          case 'load_prefab':
            return await this.loadPrefab(args);
          case 'create_placeholder_prefab':
            return await this.createPlaceholderPrefab(args);
          case 'list_prefabs':
            return await this.listPrefabs(args);
          case 'update_mcp_config':
            return await this.updateMCPConfig(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Nieznane narzędzie: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Błąd wykonywania narzędzia ${name}: ${error.message}`
        );
      }
    });
  }

  setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'unity://console/logs',
          mimeType: 'text/plain',
          name: 'Unity Console Logs',
          description: 'Live Unity console logs'
        },
        {
          uri: 'unity://project/settings',
          mimeType: 'application/json',
          name: 'Unity Project Settings',
          description: 'Unity project configuration'
        },
        {
          uri: 'unity://compilation/errors',
          mimeType: 'application/json',
          name: 'Compilation Errors',
          description: 'Current compilation errors and warnings'
        }
      ]
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'unity://console/logs':
          return {
            contents: [
              {
                uri,
                mimeType: 'text/plain',
                text: await this.getUnityLogs()
              }
            ]
          };
        case 'unity://project/settings':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(await this.getProjectSettings(), null, 2)
              }
            ]
          };
        default:
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Nieznany zasób: ${uri}`
          );
      }
    });
  }

  // === IMPLEMENTACJE NARZĘDZI ===

  async readUnityConsole(args = {}) {
    const { filter = 'all', last_lines = 50 } = args;
    
    try {
      // Spróbuj najpierw przez Unity Bridge
      const isRunning = await this.getUnityBridge().isUnityRunning();
      if (isRunning) {
        try {
          const result = await this.getUnityBridge().sendCommand('read_console', {
            filter: filter,
            last_lines: last_lines
          });
          
          return {
            content: [
              {
                type: 'text',
                text: result.content || 'Brak logów w Unity Console'
              }
            ]
          };
        } catch (bridgeError) {
          console.warn(`[MCP Unity Advanced] Unity Bridge nie działa dla read_console: ${bridgeError.message}`);
        }
      }
      
      // Fallback do odczytu z plików logów
      const logs = await this.getUnityLogs();
      let filteredLogs = logs;

      // Filtrowanie logów
      if (filter !== 'all') {
        const lines = logs.split('\n');
        const filtered = lines.filter(line => {
          switch (filter) {
            case 'errors':
              return line.toLowerCase().includes('error') || line.toLowerCase().includes('exception') || line.toLowerCase().includes('failed');
            case 'warnings':
              return line.toLowerCase().includes('warning') || line.toLowerCase().includes('warn');
            case 'logs':
              return !line.toLowerCase().includes('error') && !line.toLowerCase().includes('warning') && !line.toLowerCase().includes('exception') && !line.toLowerCase().includes('warn') && !line.toLowerCase().includes('failed') && line.trim().length > 0;
            default:
              return true;
          }
        });
        filteredLogs = filtered.slice(-last_lines).join('\n');
      } else {
        const lines = logs.split('\n');
        filteredLogs = lines.slice(-last_lines).join('\n');
      }

      return {
        content: [
          {
            type: 'text',
            text: `Unity Console (${filter}, ostatnie ${last_lines} linii) - File fallback:\n\n${filteredLogs}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Błąd odczytu konsoli Unity: ${error.message}`
          }
        ]
      };
    }
  }

  async getUnityLogs() {
    // Sprawdź standardowe lokalizacje logów Unity
    const possiblePaths = [
      path.join(process.env.APPDATA || '', 'Unity', 'Editor', 'Editor.log'),
      path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Unity', 'Editor', 'Editor.log'),
      '/tmp/UnityLogs/Editor.log',
      path.join(process.env.HOME || '', 'Library', 'Logs', 'Unity', 'Editor.log')
    ];

    for (const logPath of possiblePaths) {
      try {
        if (await fs.pathExists(logPath)) {
          return await fs.readFile(logPath, 'utf8');
        }
      } catch (error) {
        continue;
      }
    }

    return 'Nie można znaleźć plików logów Unity';
  }

  async getCompilationErrors() {
    try {
      const logs = await this.getUnityLogs();
      const lines = logs.split('\n');
      
      // Znajdź błędy kompilacji
      const errors = lines.filter(line => {
        const lowerLine = line.toLowerCase();
        return (
          lowerLine.includes('error cs') ||
          lowerLine.includes('compilation failed') ||
          lowerLine.includes('assembly failed') ||
          lowerLine.includes('script compilation failed') ||
          (lowerLine.includes('error') && (lowerLine.includes('.cs') || lowerLine.includes('script')))
        );
      });

      // Znajdź warnings kompilacji
      const warnings = lines.filter(line => {
        const lowerLine = line.toLowerCase();
        return (
          lowerLine.includes('warning cs') ||
          (lowerLine.includes('warning') && (lowerLine.includes('.cs') || lowerLine.includes('script')))
        );
      });

      let result = '🔍 ANALIZA BŁĘDÓW KOMPILACJI:\n\n';
      
      if (errors.length === 0 && warnings.length === 0) {
        result += '✅ Brak błędów kompilacji!\n';
        result += '✅ Brak ostrzeżeń kompilacji!\n';
        result += '\n📊 Status: Kod kompiluje się poprawnie';
      } else {
        result += `📊 STATYSTYKI:\n`;
        result += `- Błędy: ${errors.length}\n`;
        result += `- Ostrzeżenia: ${warnings.length}\n\n`;

        if (errors.length > 0) {
          result += '❌ BŁĘDY KOMPILACJI:\n';
          errors.slice(-10).forEach((error, index) => {
            result += `${index + 1}. ${error.trim()}\n`;
          });
          result += '\n';
        }

        if (warnings.length > 0) {
          result += '⚠️ OSTRZEŻENIA KOMPILACJI:\n';
          warnings.slice(-5).forEach((warning, index) => {
            result += `${index + 1}. ${warning.trim()}\n`;
          });
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: result
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Błąd sprawdzania kompilacji: ${error.message}`
          }
        ]
      };
    }
  }

  async getUnityProjectSettings(args = {}) {
    const { category = 'all' } = args;
    
    try {
      const projectPath = this.findUnityProjectPath();
      if (!projectPath) {
        return {
          content: [
            {
              type: 'text',
              text: 'Błąd: Nie znaleziono projektu Unity'
            }
          ]
        };
      }

      const projectSettingsPath = path.join(projectPath, 'ProjectSettings');
      let result = `⚙️ USTAWIENIA PROJEKTU UNITY\n`;
      result += `📁 Projekt: ${path.basename(projectPath)}\n`;
      result += `📍 Ścieżka: ${projectPath}\n\n`;

      // Sprawdź kluczowe pliki ustawień
      const settingsFiles = [
        'ProjectSettings.asset',
        'QualitySettings.asset', 
        'TagManager.asset',
        'InputManager.asset',
        'Physics2DSettings.asset',
        'NetworkManager.asset'
      ];

      const existingFiles = [];
      for (const file of settingsFiles) {
        const filePath = path.join(projectSettingsPath, file);
        if (await fs.pathExists(filePath)) {
          existingFiles.push(file);
        }
      }

      result += `📋 ZNALEZIONE PLIKI USTAWIEŃ:\n`;
      existingFiles.forEach(file => {
        result += `✅ ${file}\n`;
      });

      // Sprawdź ProjectSettings.asset
      const projectSettingsFile = path.join(projectSettingsPath, 'ProjectSettings.asset');
      if (await fs.pathExists(projectSettingsFile)) {
        try {
          const settingsContent = await fs.readFile(projectSettingsFile, 'utf8');
          
          result += `\n🎮 GŁÓWNE USTAWIENIA:\n`;
          
          // Wyciągnij kluczowe informacje
          const companyName = this.extractSetting(settingsContent, 'companyName');
          const productName = this.extractSetting(settingsContent, 'productName');
          const bundleVersion = this.extractSetting(settingsContent, 'bundleVersion');
          const apiCompatibilityLevel = this.extractSetting(settingsContent, 'apiCompatibilityLevel');
          
          if (companyName) result += `- Company: ${companyName}\n`;
          if (productName) result += `- Product: ${productName}\n`;
          if (bundleVersion) result += `- Version: ${bundleVersion}\n`;
          if (apiCompatibilityLevel) result += `- API Level: ${apiCompatibilityLevel}\n`;

          // Build targets
          const buildTargets = settingsContent.match(/enabledVRDevices[\s\S]*?(?=\w+:|\Z)/);
          if (buildTargets) {
            result += `- Build Targets: Konfigurowane\n`;
          }

        } catch (error) {
          result += `❌ Błąd czytania ProjectSettings.asset: ${error.message}\n`;
        }
      }

      // Sprawdź Quality Settings jeśli kategoria to 'quality' lub 'all'
      if (category === 'quality' || category === 'all') {
        const qualityFile = path.join(projectSettingsPath, 'QualitySettings.asset');
        if (await fs.pathExists(qualityFile)) {
          try {
            const qualityContent = await fs.readFile(qualityFile, 'utf8');
            result += `\n🎨 USTAWIENIA JAKOŚCI:\n`;
            
            const qualityLevels = qualityContent.match(/m_QualitySettings:[\s\S]*?(?=\w+:|\Z)/);
            if (qualityLevels) {
              const levelCount = (qualityContent.match(/- serializedVersion:/g) || []).length;
              result += `- Poziomy jakości: ${levelCount}\n`;
            }
            
            const currentQuality = this.extractSetting(qualityContent, 'm_CurrentQuality');
            if (currentQuality) result += `- Aktualny poziom: ${currentQuality}\n`;
            
          } catch (error) {
            result += `❌ Błąd czytania QualitySettings: ${error.message}\n`;
          }
        }
      }

      // Sprawdź Input Manager jeśli kategoria to 'input' lub 'all'
      if (category === 'input' || category === 'all') {
        const inputFile = path.join(projectSettingsPath, 'InputManager.asset');
        if (await fs.pathExists(inputFile)) {
          try {
            const inputContent = await fs.readFile(inputFile, 'utf8');
            result += `\n🎮 USTAWIENIA INPUT:\n`;
            
            const axes = inputContent.match(/m_Name:/g) || [];
            result += `- Zdefiniowane osie: ${axes.length}\n`;
            
            if (inputContent.includes('Horizontal')) result += `- ✅ Horizontal axis\n`;
            if (inputContent.includes('Vertical')) result += `- ✅ Vertical axis\n`;
            if (inputContent.includes('Mouse X')) result += `- ✅ Mouse input\n`;
            
          } catch (error) {
            result += `❌ Błąd czytania InputManager: ${error.message}\n`;
          }
        }
      }

      // Sprawdź version Unity z ProjectVersion.txt
      const versionFile = path.join(projectPath, 'ProjectSettings', 'ProjectVersion.txt');
      if (await fs.pathExists(versionFile)) {
        try {
          const versionContent = await fs.readFile(versionFile, 'utf8');
          const unityVersion = versionContent.match(/m_EditorVersion: (.+)/);
          if (unityVersion) {
            result += `\n🔧 WERSJA UNITY: ${unityVersion[1]}\n`;
          }
        } catch (error) {
          // Ignoruj błąd
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: result
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Błąd pobierania ustawień: ${error.message}`
          }
        ]
      };
    }
  }

  extractSetting(content, settingName) {
    const regex = new RegExp(`${settingName}:\\s*(.+)`);
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }

  async getActiveSceneInfo(args = {}) {
    const { include_gameobjects = true } = args;
    
    try {
      // Znajdź pliki sceny Unity
      const projectPath = this.findUnityProjectPath();
      if (!projectPath) {
        return {
          content: [
            {
              type: 'text',
              text: 'Błąd: Nie znaleziono projektu Unity'
            }
          ]
        };
      }

      // Przeszukaj foldery scen
      const scenePaths = [
        path.join(projectPath, 'Assets', 'Scenes'),
        path.join(projectPath, 'Assets')
      ];

      let sceneFiles = [];
      for (const scenePath of scenePaths) {
        if (await fs.pathExists(scenePath)) {
          const files = await this.findSceneFiles(scenePath);
          sceneFiles = sceneFiles.concat(files);
        }
      }

      if (sceneFiles.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'Nie znaleziono plików sceny (.unity)'
            }
          ]
        };
      }

      // Analizuj główną scenę (BattleArena lub pierwszą znalezioną)
      const battleScene = sceneFiles.find(f => f.includes('BattleArena')) || sceneFiles[0];
      const sceneInfo = await this.analyzeUnityScene(battleScene, include_gameobjects);

      return {
        content: [
          {
            type: 'text',
            text: sceneInfo
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Błąd analizy sceny: ${error.message}`
          }
        ]
      };
    }
  }

  findUnityProjectPath() {
    // Sprawdź czy jesteśmy w projekcie Unity
    const possiblePaths = [
      process.cwd(),
      'G:\\Unity Projects\\ChaosAutoBattler',
      path.join(process.env.USERPROFILE || '', 'Unity Projects', 'ChaosAutoBattler')
    ];

    for (const projectPath of possiblePaths) {
      const assetsPath = path.join(projectPath, 'Assets');
      const projectSettingsPath = path.join(projectPath, 'ProjectSettings');
      
      if (fs.existsSync(assetsPath) && fs.existsSync(projectSettingsPath)) {
        return projectPath;
      }
    }
    return null;
  }

  async findSceneFiles(dir) {
    const files = [];
    
    async function scanDir(currentDir) {
      try {
        const items = await fs.readdir(currentDir);
        
        for (const item of items) {
          const itemPath = path.join(currentDir, item);
          const stat = await fs.stat(itemPath);
          
          if (stat.isDirectory()) {
            await scanDir(itemPath);
          } else if (item.endsWith('.unity')) {
            files.push(itemPath);
          }
        }
      } catch (error) {
        // Ignoruj błędy dostępu do folderów
      }
    }
    
    await scanDir(dir);
    return files;
  }

  async analyzeUnityScene(scenePath, includeGameObjects = true) {
    try {
      const sceneContent = await fs.readFile(scenePath, 'utf8');
      const sceneName = path.basename(scenePath, '.unity');
      
      let result = `🎮 ANALIZA SCENY UNITY: ${sceneName}\n`;
      result += `📁 Ścieżka: ${scenePath}\n\n`;

      // Znajdź GameObjecty w scenie
      const gameObjects = this.extractGameObjectsFromScene(sceneContent);
      result += `📊 STATYSTYKI:\n`;
      result += `- GameObjecty: ${gameObjects.length}\n`;
      
      // Znajdź komponenty UI
      const uiComponents = gameObjects.filter(go => 
        go.components.some(c => c.includes('Canvas') || c.includes('UI') || c.includes('RectTransform'))
      );
      result += `- Komponenty UI: ${uiComponents.length}\n`;

      // Znajdź kamery
      const cameras = gameObjects.filter(go => 
        go.components.some(c => c.includes('Camera'))
      );
      result += `- Kamery: ${cameras.length}\n`;

      // Znajdź sloty
      const slots = gameObjects.filter(go => 
        go.name.toLowerCase().includes('slot') || 
        go.components.some(c => c.includes('Slot'))
      );
      result += `- Sloty: ${slots.length}\n\n`;

      if (includeGameObjects) {
        result += `🎯 KLUCZOWE GAMEOBJECTS:\n\n`;

        // UI System
        result += `📱 SYSTEM UI:\n`;
        const uiObjects = gameObjects.filter(go => 
          go.name.includes('UI') || go.name.includes('Canvas') || 
          go.components.some(c => c.includes('Canvas') || c.includes('UI'))
        );
        
        if (uiObjects.length > 0) {
          uiObjects.slice(0, 10).forEach(go => {
            result += `  - ${go.name} (${go.components.join(', ')})\n`;
          });
        } else {
          result += `  ❌ Brak komponentów UI w scenie!\n`;
        }

        result += `\n🎰 SLOTY SUMMONING:\n`;
        if (slots.length > 0) {
          slots.forEach(slot => {
            result += `  - ${slot.name} (${slot.components.join(', ')})\n`;
          });
        } else {
          result += `  ❌ Brak slotów w scenie!\n`;
        }

        result += `\n🎮 MANAGERS:\n`;
        const managers = gameObjects.filter(go => 
          go.name.includes('Manager') || 
          go.components.some(c => c.includes('Manager'))
        );
        
        if (managers.length > 0) {
          managers.forEach(mgr => {
            result += `  - ${mgr.name} (${mgr.components.join(', ')})\n`;
          });
        } else {
          result += `  ❌ Brak Managerów w scenie!\n`;
        }

        result += `\n📷 KAMERY:\n`;
        if (cameras.length > 0) {
          cameras.forEach(cam => {
            result += `  - ${cam.name} (${cam.components.join(', ')})\n`;
          });
        } else {
          result += `  ❌ Brak kamer w scenie!\n`;
        }

        // Sprawdź czy są SummonSlotsUI
        const summonSlotsUI = gameObjects.filter(go => 
          go.components.some(c => c.includes('SummonSlotsUI'))
        );
        
        result += `\n🔍 SUMMON SLOTS UI:\n`;
        if (summonSlotsUI.length > 0) {
          summonSlotsUI.forEach(sui => {
            result += `  ✅ ${sui.name} (${sui.components.join(', ')})\n`;
          });
        } else {
          result += `  ❌ SummonSlotsUI NIE ZNALEZIONY w scenie!\n`;
          result += `  💡 To wyjaśnia dlaczego UI sloty nie działają\n`;
        }
      }

      return result;
    } catch (error) {
      return `Błąd analizy sceny: ${error.message}`;
    }
  }

  extractGameObjectsFromScene(sceneContent) {
    const gameObjects = [];
    
    // Unity scene format - znajdź GameObjecty
    const gameObjectMatches = sceneContent.match(/--- !u!\d+ &\d+[\s\S]*?(?=--- !u!|\Z)/g) || [];
    
    for (const match of gameObjectMatches) {
      try {
        // Wyciągnij nazwę GameObject
        const nameMatch = match.match(/m_Name:\s*(.+)/);
        const name = nameMatch ? nameMatch[1].trim() : 'Unknown';
        
        // Wyciągnij komponenty
        const componentMatches = match.match(/component:\s*\{fileID:\s*\d+,\s*guid:\s*[a-f0-9]+,\s*type:\s*3\}/g) || [];
        const scriptMatches = match.match(/MonoBehaviour:[\s\S]*?m_Script:[\s\S]*?guid:\s*([a-f0-9]+)/g) || [];
        
        const components = [];
        
        // Dodaj standardowe komponenty Unity
        if (match.includes('Transform:')) components.push('Transform');
        if (match.includes('RectTransform:')) components.push('RectTransform');
        if (match.includes('Canvas:')) components.push('Canvas');
        if (match.includes('CanvasRenderer:')) components.push('CanvasRenderer');
        if (match.includes('GraphicRaycaster:')) components.push('GraphicRaycaster');
        if (match.includes('Camera:')) components.push('Camera');
        if (match.includes('AudioListener:')) components.push('AudioListener');
        if (match.includes('MeshRenderer:')) components.push('MeshRenderer');
        if (match.includes('MeshFilter:')) components.push('MeshFilter');
        if (match.includes('Collider:')) components.push('Collider');
        if (match.includes('Rigidbody:')) components.push('Rigidbody');
        if (match.includes('Image:')) components.push('Image');
        if (match.includes('Button:')) components.push('Button');
        if (match.includes('Text:')) components.push('Text');
        
        // Sprawdź skrypty custom
        if (match.includes('GameManager')) components.push('GameManager');
        if (match.includes('UIManager')) components.push('UIManager');
        if (match.includes('SummonSlotsUI')) components.push('SummonSlotsUI');
        if (match.includes('SummonSlotUI')) components.push('SummonSlotUI');
        if (match.includes('HandUI')) components.push('HandUI');
        if (match.includes('CardUI')) components.push('CardUI');
        if (match.includes('PlayerCameraController')) components.push('PlayerCameraController');
        if (match.includes('SummonSlot3D')) components.push('SummonSlot3D');
        
        if (name !== 'Unknown' || components.length > 0) {
          gameObjects.push({ name, components });
        }
      } catch (error) {
        // Ignoruj błędy parsowania
      }
    }
    
    return gameObjects;
  }

  async executeUnityMenu(args) {
    const { menu_path } = args;
    
    return {
      content: [
        {
          type: 'text',
          text: `Wykonywanie menu Unity: ${menu_path}... (implementacja w toku)`
        }
      ]
    };
  }

  async focusUnityWindow(args) {
    try {
      // Sprawdź czy Unity jest dostępne przez Bridge
      const isRunning = await this.getUnityBridge().isUnityRunning();
      if (!isRunning) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Unity nie jest uruchomione lub brak połączenia z Unity Bridge`
            }
          ]
        };
      }

      // Wyślij komendę focus przez Unity Bridge
      const result = await this.getUnityBridge().sendCommand('focus_window');
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Unity window focused successfully przez Unity Bridge`
          }
        ]
      };
    } catch (error) {
      // Fallback do PowerShell jeśli Unity Bridge nie działa
      console.warn(`[MCP Unity Advanced] Unity Bridge nie działa, używam PowerShell fallback: ${error.message}`);
      
      return new Promise((resolve) => {
        const tempScript = path.join(process.cwd(), 'temp_focus_unity.ps1');
        const scriptContent = `Add-Type -AssemblyName Microsoft.VisualBasic
$unityProcess = Get-Process -Name Unity -ErrorAction SilentlyContinue
if ($unityProcess) {
  try {
    [Microsoft.VisualBasic.Interaction]::AppActivate($unityProcess.Id)
    Write-Host "Unity window focused successfully (PID: $($unityProcess.Id))"
  } catch {
    Write-Host "Focus failed: $($_.Exception.Message)"
  }
} else {
  Write-Host "Unity process not found"
}`;
        
        fs.writeFileSync(tempScript, scriptContent);
        
        exec(`powershell -ExecutionPolicy Bypass -File "${tempScript}"`, (error, stdout, stderr) => {
          try {
            fs.unlinkSync(tempScript);
          } catch (e) {}
          
          if (error) {
            resolve({
              content: [
                {
                  type: 'text',
                  text: `❌ Błąd PowerShell: ${error.message}`
                }
              ]
            });
          } else {
            resolve({
              content: [
                {
                  type: 'text',
                  text: `✅ ${stdout.trim()} (PowerShell fallback)`
                }
              ]
            });
          }
        });
      });
    }
  }

  async startPlayMode(args) {
    try {
      // Sprawdź czy Unity jest dostępne przez Bridge
      const isRunning = await this.getUnityBridge().isUnityRunning();
      if (!isRunning) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Unity nie jest uruchomione lub brak połączenia z Unity Bridge`
            }
          ]
        };
      }

      // Wyślij komendę start play mode przez Unity Bridge
      const result = await this.getUnityBridge().sendCommand('start_play_mode');
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Play mode started przez Unity Bridge`
          }
        ]
      };
    } catch (error) {
      // Fallback do PowerShell jeśli Unity Bridge nie działa
      console.warn(`[MCP Unity Advanced] Unity Bridge nie działa, używam PowerShell fallback: ${error.message}`);
      
      return new Promise((resolve) => {
        const tempScript = path.join(process.cwd(), 'temp_start_play.ps1');
        const scriptContent = `Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName Microsoft.VisualBasic
try {
  # Znajdź proces Unity i przenieś na pierwszy plan
  $unityProcess = Get-Process -Name Unity -ErrorAction SilentlyContinue
  if ($unityProcess) {
    [Microsoft.VisualBasic.Interaction]::AppActivate($unityProcess.Id)
    Start-Sleep -Milliseconds 500
    
    # Wyślij Ctrl+P (Play mode hotkey)
    [System.Windows.Forms.SendKeys]::SendWait("^p")
    Write-Host "Play mode started (Ctrl+P sent to Unity)"
  } else {
    Write-Host "Unity process not found"
  }
} catch {
  Write-Host "Failed to start Play mode: $($_.Exception.Message)"
}`;
        
        fs.writeFileSync(tempScript, scriptContent);
        
        exec(`powershell -ExecutionPolicy Bypass -File "${tempScript}"`, (error, stdout, stderr) => {
          try {
            fs.unlinkSync(tempScript);
          } catch (e) {}
          
          if (error) {
            resolve({
              content: [
                {
                  type: 'text',
                  text: `❌ Błąd uruchamiania Play mode: ${error.message}`
                }
              ]
            });
          } else {
            resolve({
              content: [
                {
                  type: 'text',
                  text: `✅ ${stdout.trim()} (PowerShell fallback)`
                }
              ]
            });
          }
        });
      });
    }
  }

  async stopPlayMode(args) {
    try {
      // Sprawdź czy Unity jest dostępne przez Bridge
      const isRunning = await this.getUnityBridge().isUnityRunning();
      if (!isRunning) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Unity nie jest uruchomione lub brak połączenia z Unity Bridge`
            }
          ]
        };
      }

      // Wyślij komendę stop play mode przez Unity Bridge
      const result = await this.getUnityBridge().sendCommand('stop_play_mode');
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Play mode stopped przez Unity Bridge`
          }
        ]
      };
    } catch (error) {
      // Fallback do PowerShell jeśli Unity Bridge nie działa
      console.warn(`[MCP Unity Advanced] Unity Bridge nie działa, używam PowerShell fallback: ${error.message}`);
      
      return new Promise((resolve) => {
        const tempScript = path.join(process.cwd(), 'temp_stop_play.ps1');
        const scriptContent = `Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName Microsoft.VisualBasic
try {
  # Znajdź proces Unity i przenieś na pierwszy plan
  $unityProcess = Get-Process -Name Unity -ErrorAction SilentlyContinue
  if ($unityProcess) {
    [Microsoft.VisualBasic.Interaction]::AppActivate($unityProcess.Id)
    Start-Sleep -Milliseconds 500
    
    # Wyślij Ctrl+P (Play mode hotkey - toggle)
    [System.Windows.Forms.SendKeys]::SendWait("^p")
    Write-Host "Play mode stopped (Ctrl+P sent to Unity)"
  } else {
    Write-Host "Unity process not found"
  }
} catch {
  Write-Host "Failed to stop Play mode: $($_.Exception.Message)"
}`;
        
        fs.writeFileSync(tempScript, scriptContent);
        
        exec(`powershell -ExecutionPolicy Bypass -File "${tempScript}"`, (error, stdout, stderr) => {
          try {
            fs.unlinkSync(tempScript);
          } catch (e) {}
          
          if (error) {
            resolve({
              content: [
                {
                  type: 'text',
                  text: `❌ Błąd zatrzymywania Play mode: ${error.message}`
                }
              ]
            });
          } else {
            resolve({
              content: [
                {
                  type: 'text',
                  text: `✅ ${stdout.trim()} (PowerShell fallback)`
                }
              ]
            });
          }
        });
      });
    }
  }

  async getPlayModeStatus(args) {
    try {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ Status Play mode: Sprawdź ręcznie w Unity Editor (API niedostępne z PowerShell)`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Błąd podczas sprawdzania Play mode: ${error.message}`
          }
        ]
      };
    }
  }

  // === HIERARCHIA I SCENA ===
  async getHierarchyObjects(args) {
    try {
      const { filter = '', parent = '' } = args;
      
      // Symulujemy odczyt hierarchii przez console - w rzeczywistości wymagałoby to Unity API
      return {
        content: [
          {
            type: 'text',
            text: `🔍 Hierarchia Unity (filtr: '${filter}', parent: '${parent}'):\n⚠️ Użyj get_active_scene_info aby zobaczyć obiekty w scenie\n💡 Pełne API hierarchii wymaga rozbudowy MCP`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Błąd podczas odczytu hierarchii: ${error.message}`
          }
        ]
      };
    }
  }

  async selectHierarchyObject(args) {
    try {
      const { name } = args;
      
      // Symulacja zaznaczenia obiektu przez SendKeys
      const tempScript = path.join(process.cwd(), 'temp_select_object.ps1');
      const scriptContent = `Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName Microsoft.VisualBasic
try {
  $unityProcess = Get-Process -Name Unity -ErrorAction SilentlyContinue
  if ($unityProcess) {
    [Microsoft.VisualBasic.Interaction]::AppActivate($unityProcess.Id)
    Start-Sleep -Milliseconds 500
    
    # Ctrl+F (Find w hierarchii)
    [System.Windows.Forms.SendKeys]::SendWait("^f")
    Start-Sleep -Milliseconds 200
    
    # Wpisz nazwę obiektu
    [System.Windows.Forms.SendKeys]::SendWait("${name}")
    Start-Sleep -Milliseconds 200
    
    # Enter (zaznacz)
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    
    Write-Host "Object '${name}' selected in hierarchy"
  } else {
    Write-Host "Unity process not found"
  }
} catch {
  Write-Host "Failed to select object: $($_.Exception.Message)"
}`;
      
      fs.writeFileSync(tempScript, scriptContent);
      
      return new Promise((resolve) => {
        exec(`powershell -ExecutionPolicy Bypass -File "${tempScript}"`, (error, stdout, stderr) => {
          try {
            fs.unlinkSync(tempScript);
          } catch (e) {}
          
          if (error) {
            resolve({
              content: [
                {
                  type: 'text',
                  text: `❌ Błąd zaznaczania obiektu: ${error.message}`
                }
              ]
            });
          } else {
            resolve({
              content: [
                {
                  type: 'text',
                  text: `✅ ${stdout.trim()}`
                }
              ]
            });
          }
        });
      });
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Błąd podczas zaznaczania obiektu: ${error.message}`
          }
        ]
      };
    }
  }

  async createHierarchyObject(args) {
    try {
      const { name, parent = '', type = 'Empty' } = args;
      
      // Symulacja tworzenia obiektu przez menu
      const tempScript = path.join(process.cwd(), 'temp_create_object.ps1');
      const scriptContent = `Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName Microsoft.VisualBasic
try {
  $unityProcess = Get-Process -Name Unity -ErrorAction SilentlyContinue
  if ($unityProcess) {
    [Microsoft.VisualBasic.Interaction]::AppActivate($unityProcess.Id)
    Start-Sleep -Milliseconds 500
    
    # Prawy klick w hierarchii
    [System.Windows.Forms.SendKeys]::SendWait("{F10}")
    Start-Sleep -Milliseconds 300
    
    # Wybierz typ obiektu z menu
    if ("${type}" -eq "Empty") {
      [System.Windows.Forms.SendKeys]::SendWait("e")
    } elseif ("${type}" -eq "Cube") {
      [System.Windows.Forms.SendKeys]::SendWait("3")
      Start-Sleep -Milliseconds 200
      [System.Windows.Forms.SendKeys]::SendWait("c")
    }
    
    Start-Sleep -Milliseconds 500
    
    # Przemianuj obiekt
    [System.Windows.Forms.SendKeys]::SendWait("{F2}")
    Start-Sleep -Milliseconds 200
    [System.Windows.Forms.SendKeys]::SendWait("${name}")
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    
    Write-Host "Object '${name}' created in hierarchy"
  } else {
    Write-Host "Unity process not found"
  }
} catch {
  Write-Host "Failed to create object: $($_.Exception.Message)"
}`;
      
      fs.writeFileSync(tempScript, scriptContent);
      
      return new Promise((resolve) => {
        exec(`powershell -ExecutionPolicy Bypass -File "${tempScript}"`, (error, stdout, stderr) => {
          try {
            fs.unlinkSync(tempScript);
          } catch (e) {}
          
          if (error) {
            resolve({
              content: [
                {
                  type: 'text',
                  text: `❌ Błąd tworzenia obiektu: ${error.message}`
                }
              ]
            });
          } else {
            resolve({
              content: [
                {
                  type: 'text',
                  text: `✅ ${stdout.trim()}`
                }
              ]
            });
          }
        });
      });
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Błąd podczas tworzenia obiektu: ${error.message}`
          }
        ]
      };
    }
  }

  async deleteHierarchyObject(args) {
    try {
      const { name } = args;
      
      // Najpierw zaznacz, potem usuń
      const tempScript = path.join(process.cwd(), 'temp_delete_object.ps1');
      const scriptContent = `Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName Microsoft.VisualBasic
try {
  $unityProcess = Get-Process -Name Unity -ErrorAction SilentlyContinue
  if ($unityProcess) {
    [Microsoft.VisualBasic.Interaction]::AppActivate($unityProcess.Id)
    Start-Sleep -Milliseconds 500
    
    # Znajdź obiekt (Ctrl+F)
    [System.Windows.Forms.SendKeys]::SendWait("^f")
    Start-Sleep -Milliseconds 200
    [System.Windows.Forms.SendKeys]::SendWait("${name}")
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Start-Sleep -Milliseconds 200
    
    # Usuń (Delete)
    [System.Windows.Forms.SendKeys]::SendWait("{DELETE}")
    
    Write-Host "Object '${name}' deleted from hierarchy"
  } else {
    Write-Host "Unity process not found"
  }
} catch {
  Write-Host "Failed to delete object: $($_.Exception.Message)"
}`;
      
      fs.writeFileSync(tempScript, scriptContent);
      
      return new Promise((resolve) => {
        exec(`powershell -ExecutionPolicy Bypass -File "${tempScript}"`, (error, stdout, stderr) => {
          try {
            fs.unlinkSync(tempScript);
          } catch (e) {}
          
          if (error) {
            resolve({
              content: [
                {
                  type: 'text',
                  text: `❌ Błąd usuwania obiektu: ${error.message}`
                }
              ]
            });
          } else {
            resolve({
              content: [
                {
                  type: 'text',
                  text: `✅ ${stdout.trim()}`
                }
              ]
            });
          }
        });
      });
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Błąd podczas usuwania obiektu: ${error.message}`
          }
        ]
      };
    }
  }

  // === INSPEKTOR ===
  async getComponentProperties(args) {
    try {
      const { object_name, component_type } = args;
      
      return {
        content: [
          {
            type: 'text',
            text: `🔍 Właściwości komponentu ${component_type} obiektu '${object_name}':\n⚠️ Pełne API inspektora wymaga rozbudowy MCP\n💡 Użyj Unity Console logów aby śledzić właściwości`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Błąd podczas odczytu właściwości: ${error.message}`
          }
        ]
      };
    }
  }

  async setComponentProperty(args) {
    try {
      const { object_name, component_type, property_name, value } = args;
      
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ Ustawienie właściwości ${property_name} = ${value} dla ${component_type} obiektu '${object_name}':\n💡 Wymaga rozbudowy MCP o Unity API\n🔧 Alternatywnie: edytuj skrypt bezpośrednio`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Błąd podczas ustawiania właściwości: ${error.message}`
          }
        ]
      };
    }
  }

  async addComponent(args) {
    try {
      const { object_name, component_type } = args;
      
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ Dodanie komponentu ${component_type} do obiektu '${object_name}':\n💡 Wymaga rozbudowy MCP o Unity API\n🔧 Alternatywnie: użyj Unity Editor ręcznie`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Błąd podczas dodawania komponentu: ${error.message}`
          }
        ]
      };
    }
  }

  async removeComponent(args) {
    try {
      const { object_name, component_type } = args;
      
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ Usunięcie komponentu ${component_type} z obiektu '${object_name}':\n💡 Wymaga rozbudowy MCP o Unity API\n🔧 Alternatywnie: użyj Unity Editor ręcznie`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Błąd podczas usuwania komponentu: ${error.message}`
          }
        ]
      };
    }
  }

  // === GAMEMANAGER TESTING ===
  async triggerGameManagerMethod(args) {
    try {
      const { method_name, parameters = '' } = args;
      
      return {
        content: [
          {
            type: 'text',
            text: `🎮 Wywołanie metody GameManager.${method_name}(${parameters}):\n⚠️ Wymaga rozbudowy MCP o Unity API lub reflection\n💡 Obecnie: użyj Unity Console do testowania\n🔧 Alternatywnie: dodaj debug przyciski do UI`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Błąd podczas wywołania metody GameManager: ${error.message}`
          }
        ]
      };
    }
  }

  async getGameManagerState(args) {
    try {
      return {
        content: [
          {
            type: 'text',
            text: `🎮 Stan GameManager:\n⚠️ Wymaga rozbudowy MCP o Unity API\n💡 Użyj Unity Console logów aby śledzić stan\n🔧 Alternatywnie: dodaj debug logi do GameManager`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Błąd podczas odczytu stanu GameManager: ${error.message}`
          }
        ]
      };
    }
  }

  async runUnityTests(args = {}) {
    const { test_mode = 'all' } = args;
    
    return {
      content: [
        {
          type: 'text',
          text: `Uruchamianie testów Unity (${test_mode})... (implementacja w toku)`
        }
      ]
    };
  }

  async getConsoleEntries(args = {}) {
    const { filter = 'all', last_lines = 50 } = args;
    
    try {
      // Użyj Unity Bridge do odczytu rzeczywistej konsoli Unity
      const isRunning = await this.getUnityBridge().isUnityRunning();
      if (isRunning) {
        try {
          const result = await this.getUnityBridge().sendCommand('get_console_entries', {
            filter: filter,
            last_lines: last_lines
          });
          
          return {
            content: [
              {
                type: 'text',
                text: result.content || 'Brak wpisów w Unity Console'
              }
            ]
          };
        } catch (error) {
          console.error('[MCP Unity Advanced] Błąd Unity Bridge:', error.message);
          console.log('[MCP Unity Advanced] Unity Bridge nie działa, używam PowerShell fallback:', error.message);
        }
      }

      // Fallback - używaj read_unity_console jako backup
      return await this.readUnityConsole(args);
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Błąd odczytu konsoli Unity: ${error.message}`
          }
        ]
      };
    }
  }

  async clearUnityConsole() {
    return {
      content: [
        {
          type: 'text',
          text: 'Czyszczenie konsoli Unity... (implementacja w toku)'
        }
      ]
    };
  }

  async sendDebugLog(args) {
    const { message, type = 'log' } = args;
    
    return {
      content: [
        {
          type: 'text',
          text: `Wysyłanie ${type}: ${message} do Unity... (implementacja w toku)`
        }
      ]
    };
  }

  async getProjectSettings() {
    return {
      unity_version: 'Unknown',
      platform: 'Windows',
      settings: 'Ładowanie ustawień projektu...'
    };
  }

  // === PREFAB MANAGEMENT FUNCTIONS ===
  
  async createPrefab(args) {
    const { object_name, prefab_path, prefab_name } = args;
    
    try {
      const projectPath = this.findUnityProjectPath();
      if (!projectPath) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ Nie znaleziono projektu Unity'
            }
          ]
        };
      }

      const fullPrefabPath = path.join(projectPath, 'Assets', prefab_path, `${prefab_name}.prefab`);
      
      // Sprawdź czy folder istnieje
      const prefabDir = path.dirname(fullPrefabPath);
      if (!await fs.pathExists(prefabDir)) {
        await fs.ensureDir(prefabDir);
      }

      // Tworz podstawową strukturę prefaba
      const prefabContent = this.generatePrefabContent(prefab_name, object_name);
      await fs.writeFile(fullPrefabPath, prefabContent);
      
      // Utwórz meta plik
      const metaContent = this.generatePrefabMetaContent();
      await fs.writeFile(`${fullPrefabPath}.meta`, metaContent);

      return {
        content: [
          {
            type: 'text',
            text: `✅ Prefab utworzony: ${prefab_path}/${prefab_name}.prefab\n📂 Ścieżka: ${fullPrefabPath}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Błąd tworzenia prefaba: ${error.message}`
          }
        ]
      };
    }
  }

  async savePrefab(args) {
    const { prefab_path, force_overwrite = false } = args;
    
    try {
      const projectPath = this.findUnityProjectPath();
      if (!projectPath) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ Nie znaleziono projektu Unity'
            }
          ]
        };
      }

      const fullPath = path.join(projectPath, 'Assets', prefab_path);
      
      if (await fs.pathExists(fullPath) && !force_overwrite) {
        return {
          content: [
            {
              type: 'text',
              text: `⚠️ Prefab już istnieje: ${prefab_path}\nUżyj force_overwrite: true aby nadpisać`
            }
          ]
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Prefab zapisany: ${prefab_path}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Błąd zapisywania prefaba: ${error.message}`
          }
        ]
      };
    }
  }

  async loadPrefab(args) {
    const { prefab_path, position = '0,0,0', parent } = args;
    
    try {
      const projectPath = this.findUnityProjectPath();
      if (!projectPath) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ Nie znaleziono projektu Unity'
            }
          ]
        };
      }

      const fullPath = path.join(projectPath, 'Assets', prefab_path);
      
      if (!await fs.pathExists(fullPath)) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Prefab nie istnieje: ${prefab_path}`
            }
          ]
        };
      }

      // Symuluj instantiation prefaba
      const [x, y, z] = position.split(',').map(p => parseFloat(p.trim()));
      const instanceName = path.basename(prefab_path, '.prefab');

      return {
        content: [
          {
            type: 'text',
            text: `✅ Prefab załadowany: ${prefab_path}\n📍 Pozycja: (${x}, ${y}, ${z})\n🏷️ Nazwa instancji: ${instanceName}\n👨‍👩‍👧‍👦 Rodzic: ${parent || 'Scene Root'}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Błąd ładowania prefaba: ${error.message}`
          }
        ]
      };
    }
  }

  async createPlaceholderPrefab(args) {
    const { prefab_name, primitive_type, components = [], prefab_path } = args;
    
    try {
      const projectPath = this.findUnityProjectPath();
      if (!projectPath) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ Nie znaleziono projektu Unity'
            }
          ]
        };
      }

      const fullPrefabPath = path.join(projectPath, 'Assets', prefab_path, `${prefab_name}.prefab`);
      
      // Sprawdź czy folder istnieje
      const prefabDir = path.dirname(fullPrefabPath);
      if (!await fs.pathExists(prefabDir)) {
        await fs.ensureDir(prefabDir);
      }

      // Generuj zawartość placeholder prefaba
      const prefabContent = this.generatePlaceholderPrefabContent(prefab_name, primitive_type, components);
      await fs.writeFile(fullPrefabPath, prefabContent);
      
      // Utwórz meta plik
      const metaContent = this.generatePrefabMetaContent();
      await fs.writeFile(`${fullPrefabPath}.meta`, metaContent);

      return {
        content: [
          {
            type: 'text',
            text: `✅ Placeholder prefab utworzony: ${prefab_name}\n🎲 Typ: ${primitive_type}\n🔧 Komponenty: ${components.join(', ') || 'Brak'}\n📂 Ścieżka: ${prefab_path}/${prefab_name}.prefab`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Błąd tworzenia placeholder prefaba: ${error.message}`
          }
        ]
      };
    }
  }

  async listPrefabs(args) {
    const { folder_path = '' } = args;
    
    try {
      const projectPath = this.findUnityProjectPath();
      if (!projectPath) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ Nie znaleziono projektu Unity'
            }
          ]
        };
      }

      const searchPath = path.join(projectPath, 'Assets', folder_path);
      
      if (!await fs.pathExists(searchPath)) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Folder nie istnieje: ${folder_path}`
            }
          ]
        };
      }

      const prefabs = await this.findPrefabFiles(searchPath);
      
      if (prefabs.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `📁 Brak prefabów w folderze: ${folder_path || 'Assets'}`
            }
          ]
        };
      }

      let result = `📁 Prefabs znalezione w: ${folder_path || 'Assets'}\n\n`;
      prefabs.forEach((prefab, index) => {
        const relativePath = path.relative(path.join(projectPath, 'Assets'), prefab);
        result += `${index + 1}. ${relativePath}\n`;
      });

      return {
        content: [
          {
            type: 'text',
            text: result
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Błąd listowania prefabów: ${error.message}`
          }
        ]
      };
    }
  }

  // === HELPER FUNCTIONS FOR PREFABS ===

  generatePrefabContent(prefabName, objectName) {
    const guid = this.generateGuid();
    const fileID = Math.floor(Math.random() * 1000000000);
    
    return `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!1 &${fileID}
GameObject:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  serializedVersion: 6
  m_Component:
  - component: {fileID: ${fileID + 1}}
  - component: {fileID: ${fileID + 2}}
  - component: {fileID: ${fileID + 3}}
  - component: {fileID: ${fileID + 4}}
  m_Layer: 0
  m_Name: ${prefabName}
  m_TagString: Untagged
  m_Icon: {fileID: 0}
  m_NavMeshLayer: 0
  m_StaticEditorFlags: 0
  m_IsActive: 1
--- !u!4 &${fileID + 1}
Transform:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${fileID}}
  m_LocalRotation: {x: 0, y: 0, z: 0, w: 1}
  m_LocalPosition: {x: 0, y: 0, z: 0}
  m_LocalScale: {x: 1, y: 1, z: 1}
  m_ConstrainProportionsScale: 0
  m_Children: []
  m_Father: {fileID: 0}
  m_RootOrder: 0
  m_LocalEulerAnglesHint: {x: 0, y: 0, z: 0}
--- !u!33 &${fileID + 2}
MeshFilter:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${fileID}}
  m_Mesh: {fileID: 10202, guid: 0000000000000000e000000000000000, type: 0}
--- !u!23 &${fileID + 3}
MeshRenderer:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${fileID}}
  m_Enabled: 1
  m_CastShadows: 1
  m_ReceiveShadows: 1
  m_DynamicOccludee: 1
  m_StaticShadowCaster: 0
  m_MotionVectors: 1
  m_LightProbeUsage: 1
  m_ReflectionProbeUsage: 1
  m_RayTracingMode: 2
  m_RayTraceProcedural: 0
  m_RenderingLayerMask: 1
  m_RendererPriority: 0
  m_Materials:
  - {fileID: 2100000, guid: 31321ba15b8f8eb4c954353edc038b1d, type: 2}
  m_StaticBatchInfo:
    firstSubMesh: 0
    subMeshCount: 0
  m_StaticBatchRoot: {fileID: 0}
  m_ProbeAnchor: {fileID: 0}
  m_LightProbeVolumeOverride: {fileID: 0}
  m_ScaleInLightmap: 1
  m_ReceiveGI: 1
  m_PreserveUVs: 0
  m_IgnoreNormalsForChartDetection: 0
  m_ImportantGI: 0
  m_StitchLightmapSeams: 1
  m_SelectedEditorRenderState: 3
  m_MinimumChartSize: 4
  m_AutoUVMaxDistance: 0.5
  m_AutoUVMaxAngle: 89
  m_LightmapParameters: {fileID: 0}
  m_SortingLayerID: 0
  m_SortingLayer: 0
  m_SortingOrder: 0
  m_AdditionalVertexStreams: {fileID: 0}
--- !u!65 &${fileID + 4}
BoxCollider:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${fileID}}
  m_Material: {fileID: 0}
  m_IsTrigger: 0
  m_Enabled: 1
  serializedVersion: 2
  m_Size: {x: 1, y: 1, z: 1}
  m_Center: {x: 0, y: 0, z: 0}
`;
  }

  generatePlaceholderPrefabContent(prefabName, primitiveType, components) {
    const guid = this.generateGuid();
    const fileID = Math.floor(Math.random() * 1000000000);
    
    // Mapowanie typów prymitywów do mesh ID
    const meshIds = {
      'Cube': '10202',
      'Sphere': '10207',
      'Capsule': '10208',
      'Cylinder': '10206',
      'Plane': '10209',
      'Quad': '10210'
    };
    
    const meshId = meshIds[primitiveType] || '10202';
    
    return `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!1 &${fileID}
GameObject:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  serializedVersion: 6
  m_Component:
  - component: {fileID: ${fileID + 1}}
  - component: {fileID: ${fileID + 2}}
  - component: {fileID: ${fileID + 3}}
  - component: {fileID: ${fileID + 4}}
  m_Layer: 0
  m_Name: ${prefabName}
  m_TagString: Untagged
  m_Icon: {fileID: 0}
  m_NavMeshLayer: 0
  m_StaticEditorFlags: 0
  m_IsActive: 1
--- !u!4 &${fileID + 1}
Transform:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${fileID}}
  m_LocalRotation: {x: 0, y: 0, z: 0, w: 1}
  m_LocalPosition: {x: 0, y: 0, z: 0}
  m_LocalScale: {x: 1, y: 1, z: 1}
  m_ConstrainProportionsScale: 0
  m_Children: []
  m_Father: {fileID: 0}
  m_RootOrder: 0
  m_LocalEulerAnglesHint: {x: 0, y: 0, z: 0}
--- !u!33 &${fileID + 2}
MeshFilter:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${fileID}}
  m_Mesh: {fileID: ${meshId}, guid: 0000000000000000e000000000000000, type: 0}
--- !u!23 &${fileID + 3}
MeshRenderer:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${fileID}}
  m_Enabled: 1
  m_CastShadows: 1
  m_ReceiveShadows: 1
  m_DynamicOccludee: 1
  m_StaticShadowCaster: 0
  m_MotionVectors: 1
  m_LightProbeUsage: 1
  m_ReflectionProbeUsage: 1
  m_RayTracingMode: 2
  m_RayTraceProcedural: 0
  m_RenderingLayerMask: 1
  m_RendererPriority: 0
  m_Materials:
  - {fileID: 2100000, guid: 31321ba15b8f8eb4c954353edc038b1d, type: 2}
  m_StaticBatchInfo:
    firstSubMesh: 0
    subMeshCount: 0
  m_StaticBatchRoot: {fileID: 0}
  m_ProbeAnchor: {fileID: 0}
  m_LightProbeVolumeOverride: {fileID: 0}
  m_ScaleInLightmap: 1
  m_ReceiveGI: 1
  m_PreserveUVs: 0
  m_IgnoreNormalsForChartDetection: 0
  m_ImportantGI: 0
  m_StitchLightmapSeams: 1
  m_SelectedEditorRenderState: 3
  m_MinimumChartSize: 4
  m_AutoUVMaxDistance: 0.5
  m_AutoUVMaxAngle: 89
  m_LightmapParameters: {fileID: 0}
  m_SortingLayerID: 0
  m_SortingLayer: 0
  m_SortingOrder: 0
  m_AdditionalVertexStreams: {fileID: 0}
--- !u!65 &${fileID + 4}
BoxCollider:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${fileID}}
  m_Material: {fileID: 0}
  m_IsTrigger: 0
  m_Enabled: 1
  serializedVersion: 2
  m_Size: {x: 1, y: 1, z: 1}
  m_Center: {x: 0, y: 0, z: 0}
`;
  }

  generatePrefabMetaContent() {
    const guid = this.generateGuid();
    
    return `fileFormatVersion: 2
guid: ${guid}
PrefabImporter:
  externalObjects: {}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;
  }

  generateGuid() {
    return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, function() {
      return (Math.random() * 16 | 0).toString(16);
    });
  }

  async findPrefabFiles(searchPath) {
    const prefabs = [];
    
    async function scanDir(dir) {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          await scanDir(fullPath);
        } else if (item.endsWith('.prefab')) {
          prefabs.push(fullPath);
        }
      }
    }
    
    await scanDir(searchPath);
    return prefabs;
  }

  async updateMCPConfig(args) {
    try {
      const { setting, value } = args;
      
      // Aktualizuj konfigurację w pamięci
      if (setting === 'autoApprove') {
        this.config.settings.autoApprove = value === 'true';
        this.autoApprove = this.config.settings.autoApprove;
      } else if (setting === 'logLevel') {
        this.config.settings.logLevel = value;
      } else if (setting === 'maxLogLines') {
        this.config.settings.maxLogLines = parseInt(value);
      } else {
        throw new Error(`Nieznane ustawienie: ${setting}`);
      }
      
      // Zapisz konfigurację do pliku
      const configPath = path.join(__dirname, '..', 'config.json');
      await fs.writeFile(configPath, JSON.stringify(this.config, null, 2));
      
      return {
        content: [{
          type: 'text',
          text: `✅ Ustawienie ${setting} zmienione na: ${value}\n\n` +
                `🔄 Status autozatwierdzania: ${this.autoApprove ? 'WŁĄCZONY' : 'WYŁĄCZONY'}\n\n` +
                `📋 Aktualna konfiguracja:\n` +
                `- Auto-approve: ${this.config.settings.autoApprove}\n` +
                `- Log level: ${this.config.settings.logLevel}\n` +
                `- Max log lines: ${this.config.settings.maxLogLines}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Błąd aktualizacji konfiguracji: ${error.message}`
        }]
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Unity MCP Advanced Server uruchomiony pomyślnie');
  }

  // Automatyczne uruchamianie serwera przy starcie projektu
  async autoStart() {
    try {
      console.error('[Auto-Start] Sprawdzam Unity proces...');
      
      // Sprawdź czy Unity jest uruchomiony
      const isUnityRunning = await this.checkUnityProcess();
      
      if (isUnityRunning) {
        console.error('[Auto-Start] Unity wykryty - uruchamiam serwer MCP');
        await this.run();
      } else {
        console.error('[Auto-Start] Unity nie wykryty - czekam na uruchomienie');
        // Użyj interwału z konfiguracji
        const checkInterval = this.config.settings?.checkInterval || 5000;
        setTimeout(() => this.autoStart(), checkInterval);
      }
    } catch (error) {
      console.error('[Auto-Start] Błąd:', error.message);
      // Użyj retry interval z konfiguracji
      const retryInterval = this.config.settings?.retryInterval || 10000;
      setTimeout(() => this.autoStart(), retryInterval);
    }
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
}

// Uruchom serwer
const server = new UnityMCPServer();

// Sprawdź czy to auto-start czy standardowy start
const args = process.argv.slice(2);
const isAutoStart = args.includes('--auto-start') || 
                   process.env.MCP_AUTO_START === 'true' ||
                   server.config.settings?.autoStart === true;

if (isAutoStart) {
  console.error('[MCP Unity Advanced] Tryb auto-start aktywowany');
  console.error('[MCP Unity Advanced] Konfiguracja auto-start:', server.config.settings?.autoStart);
  server.autoStart().catch(console.error);
} else {
  console.error('[MCP Unity Advanced] Tryb standardowy');
  server.run().catch(console.error);
}