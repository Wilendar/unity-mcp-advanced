using System;
using System.Diagnostics;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace UnityMcpBridge.Editor
{
    public class SimpleMcpBridge : EditorWindow
    {
        private bool isMcpAdvancedRunning = false;
        private string projectPath;
        private Vector2 scrollPosition;

        [MenuItem("Window/Unity MCP Bridge")]
        public static void ShowWindow()
        {
            UnityEngine.Debug.Log("[Unity MCP Bridge] Opening Unity MCP Bridge window");
            var window = GetWindow<SimpleMcpBridge>("Unity MCP Bridge");
            window.minSize = new Vector2(500, 300);
        }

        private void OnEnable()
        {
            UnityEngine.Debug.Log("[Unity MCP Bridge] OnEnable called");
            projectPath = Directory.GetParent(Application.dataPath).FullName;
            CheckMcpStatus();
        }

        private void OnGUI()
        {
            scrollPosition = EditorGUILayout.BeginScrollView(scrollPosition);

            // Title
            GUIStyle titleStyle = new GUIStyle(EditorStyles.boldLabel)
            {
                fontSize = 16,
                alignment = TextAnchor.MiddleCenter
            };
            EditorGUILayout.LabelField("Unity MCP Bridge - Control Panel", titleStyle);
            EditorGUILayout.Space(15);

            // Project info
            EditorGUILayout.BeginVertical(EditorStyles.helpBox);
            EditorGUILayout.LabelField("Project Information", EditorStyles.boldLabel);
            EditorGUILayout.LabelField($"Path: {projectPath}");
            EditorGUILayout.EndVertical();
            EditorGUILayout.Space(10);

            // MCP Unity Advanced
            EditorGUILayout.BeginVertical(EditorStyles.helpBox);
            EditorGUILayout.LabelField("MCP Unity Advanced", EditorStyles.boldLabel);
            
            string status = isMcpAdvancedRunning ? "🟢 Running" : "🔴 Stopped";
            EditorGUILayout.LabelField($"Status: {status}");
            EditorGUILayout.LabelField("Port: 6401");
            EditorGUILayout.LabelField("Features: 32 MCP tools, file fallback");
            
            EditorGUILayout.Space(5);
            
            if (GUILayout.Button(isMcpAdvancedRunning ? "Stop MCP Advanced" : "Start MCP Advanced"))
            {
                ToggleMcpAdvanced();
            }
            
            if (GUILayout.Button("Test MCP Advanced"))
            {
                TestMcpAdvanced();
            }
            
            EditorGUILayout.EndVertical();
            EditorGUILayout.Space(10);

            // Configuration
            EditorGUILayout.BeginVertical(EditorStyles.helpBox);
            EditorGUILayout.LabelField("Claude Code CLI Configuration", EditorStyles.boldLabel);
            
            EditorGUILayout.HelpBox(
                "Configure Claude Code CLI to use MCP servers.\n" +
                "Creates both global (~/.claude/) and project-specific (.claude/) configs.\n" +
                "Compatible with Windows, Linux, and macOS.", 
                MessageType.Info);
            
            if (GUILayout.Button("Generate Claude Config"))
            {
                GenerateConfig();
            }
            
            EditorGUILayout.EndVertical();
            EditorGUILayout.Space(10);

            // Status
            EditorGUILayout.BeginVertical(EditorStyles.helpBox);
            EditorGUILayout.LabelField("Connection Status", EditorStyles.boldLabel);
            
            string advancedStatus = isMcpAdvancedRunning ? "✅ Available" : "❌ Not running";
            EditorGUILayout.LabelField($"MCP Advanced: {advancedStatus}");
            EditorGUILayout.LabelField("Unity MCP: ✅ File-based (always ready)");
            
            string tcpServerStatus = UnityTcpServer.IsServerRunning() ? "✅ Running on port 6401" : "❌ Not running";
            EditorGUILayout.LabelField($"TCP Server: {tcpServerStatus}");
            
            EditorGUILayout.Space(5);
            
            EditorGUILayout.BeginHorizontal();
            if (GUILayout.Button("Start TCP Server"))
            {
                UnityTcpServer.StartTcpServer();
            }
            if (GUILayout.Button("Stop TCP Server"))
            {
                UnityTcpServer.StopTcpServer();
            }
            if (GUILayout.Button("Restart TCP Server"))
            {
                UnityTcpServer.RestartTcpServer();
            }
            EditorGUILayout.EndHorizontal();
            
            EditorGUILayout.EndVertical();

            EditorGUILayout.EndScrollView();
        }

        private void CheckMcpStatus()
        {
            try
            {
                var processes = Process.GetProcessesByName("node");
                isMcpAdvancedRunning = false;
                foreach (var process in processes)
                {
                    try
                    {
                        string fileName = process.MainModule?.FileName ?? "";
                        if (fileName.Contains("node"))
                        {
                            isMcpAdvancedRunning = true;
                            break;
                        }
                    }
                    catch { }
                }
            }
            catch (Exception ex)
            {
                UnityEngine.Debug.LogWarning($"Error checking MCP status: {ex.Message}");
            }
        }

        private void ToggleMcpAdvanced()
        {
            string mcpPath = Path.Combine(projectPath, "mcp-unity-advanced");
            
            if (!Directory.Exists(mcpPath))
            {
                EditorUtility.DisplayDialog("Error", $"MCP Advanced not found at:\n{mcpPath}", "OK");
                return;
            }

            if (isMcpAdvancedRunning)
            {
                try
                {
                    var processes = Process.GetProcessesByName("node");
                    foreach (var process in processes)
                    {
                        try
                        {
                            process.Kill();
                        }
                        catch { }
                    }
                    isMcpAdvancedRunning = false;
                    UnityEngine.Debug.Log("MCP Advanced stopped");
                }
                catch (Exception ex)
                {
                    UnityEngine.Debug.LogError($"Error stopping MCP Advanced: {ex.Message}");
                }
            }
            else
            {
                try
                {
                    ProcessStartInfo startInfo = new ProcessStartInfo
                    {
                        FileName = "node",
                        Arguments = "src/index.js",
                        WorkingDirectory = mcpPath,
                        UseShellExecute = true
                    };

                    Process.Start(startInfo);
                    isMcpAdvancedRunning = true;
                    UnityEngine.Debug.Log("MCP Advanced started");
                }
                catch (Exception ex)
                {
                    UnityEngine.Debug.LogError($"Error starting MCP Advanced: {ex.Message}");
                }
            }
        }

        private void TestMcpAdvanced()
        {
            string mcpPath = Path.Combine(projectPath, "mcp-unity-advanced");
            
            if (!Directory.Exists(mcpPath))
            {
                EditorUtility.DisplayDialog("Error", "MCP Advanced not found", "OK");
                return;
            }

            try
            {
                ProcessStartInfo startInfo = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = $"-ExecutionPolicy Bypass -Command \"cd '{mcpPath}'; Write-Host 'Testing MCP Unity Advanced...' -ForegroundColor Yellow; echo '{{\\\"jsonrpc\\\": \\\"2.0\\\", \\\"method\\\": \\\"tools/call\\\", \\\"params\\\": {{\\\"name\\\": \\\"read_unity_console\\\", \\\"arguments\\\": {{\\\"filter\\\": \\\"all\\\", \\\"last_lines\\\": 5}}}}, \\\"id\\\": 1}}' | node src/index.js; Write-Host 'Test completed. Press Enter to close...' -ForegroundColor Cyan; Read-Host\"",
                    UseShellExecute = true
                };

                Process.Start(startInfo);
                UnityEngine.Debug.Log("Testing MCP Advanced - check PowerShell window");
            }
            catch (Exception ex)
            {
                UnityEngine.Debug.LogError($"Test failed: {ex.Message}");
            }
        }

        private void GenerateConfig()
        {
            // POPRAWNY FORMAT - używamy .mcp.json zgodnie z oficjalnymi wytycznymi Claude Code
            string mcpConfigPath = Path.Combine(projectPath, ".mcp.json");
            
            string mcpAdvancedPath = Path.Combine(projectPath, "mcp-unity-advanced", "src", "index.js").Replace("\\", "/");
            string unityMcpPath = Path.Combine(projectPath, "unity-mcp", "src", "server.py").Replace("\\", "/");
            
            // Create config according to Claude Code CLI documentation structure
            string config = "{\n";
            config += "  \"mcpServers\": {\n";
            config += "    \"unity-mcp-advanced\": {\n";
            config += "      \"command\": \"node\",\n";
            config += "      \"args\": [\"" + mcpAdvancedPath + "\"]\n";
            config += "    }";
            
            // Add unity-mcp only if it exists
            if (File.Exists(Path.Combine(projectPath, "unity-mcp", "src", "server.py")))
            {
                config += ",\n";
                config += "    \"unity-mcp\": {\n";
                config += "      \"command\": \"python\",\n";
                config += "      \"args\": [\"" + unityMcpPath + "\"]\n";
                config += "    }\n";
            }
            else
            {
                config += "\n";
            }
            
            config += "  }\n";
            config += "}";

            // Save .mcp.json config
            bool mcpSuccess = false;
            string savedPaths = "";

            try
            {
                // MCP config - główna konfiguracja dla MCP serwerów
                File.WriteAllText(mcpConfigPath, config);
                mcpSuccess = true;
                savedPaths += $"MCP Config: {mcpConfigPath}\n";
                UnityEngine.Debug.Log($"MCP configuration saved to: {mcpConfigPath}");
            }
            catch (Exception ex)
            {
                UnityEngine.Debug.LogWarning($"Failed to save MCP config: {ex.Message}");
            }

            if (mcpSuccess)
            {
                string message = $"Claude Code CLI configuration saved!\n\n{savedPaths}\n";
                message += "Usage:\n";
                message += "• Run 'claude' in project directory to use automatically\n";
                message += "• MCP servers will be loaded from .mcp.json\n";
                message += "• Alternative: claude mcp add unity-mcp-advanced node \"" + mcpAdvancedPath + "\"";
                
                EditorUtility.DisplayDialog("Success", message, "OK");
            }
            else
            {
                EditorUtility.DisplayDialog("Error", 
                    "Failed to save MCP configuration. Check Unity Console for details.", 
                    "OK");
            }
        }

        private void OnInspectorUpdate()
        {
            CheckMcpStatus();
            Repaint();
        }
    }
}