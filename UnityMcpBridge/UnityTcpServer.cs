using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using UnityEditor;
using UnityEngine;

namespace UnityMcpBridge.Editor
{
    [InitializeOnLoad]
    public class UnityTcpServer
    {
        private static TcpListener tcpListener;
        private static Thread tcpListenerThread;
        private static bool isListening = false;
        private static int port = 6401;
        private static List<TcpClient> connectedClients = new List<TcpClient>();

        static UnityTcpServer()
        {
            // Auto-start TCP server when Unity starts
            EditorApplication.delayCall += () =>
            {
                Debug.Log("[Unity TCP Server] Initializing TCP server...");
                StartTcpServer();
            };

            // Stop TCP server when Unity closes
            EditorApplication.quitting += () =>
            {
                StopTcpServer();
            };
        }

        public static void StartTcpServer()
        {
            if (isListening)
            {
                Debug.Log("[Unity TCP Server] Server is already running");
                return;
            }

            try
            {
                tcpListener = new TcpListener(IPAddress.Any, port);
                tcpListenerThread = new Thread(new ThreadStart(ListenForClients));
                tcpListenerThread.IsBackground = true;
                tcpListenerThread.Start();
                
                isListening = true;
                Debug.Log($"[Unity TCP Server] Started on port {port}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Unity TCP Server] Failed to start: {ex.Message}");
            }
        }

        public static void StopTcpServer()
        {
            if (!isListening)
            {
                Debug.Log("[Unity TCP Server] Server is not running");
                return;
            }

            try
            {
                isListening = false;
                
                // Close all connected clients
                foreach (var client in connectedClients)
                {
                    try
                    {
                        client.Close();
                    }
                    catch { }
                }
                connectedClients.Clear();

                // Stop the listener
                if (tcpListener != null)
                {
                    tcpListener.Stop();
                    tcpListener = null;
                }

                // Stop the thread gracefully instead of using Abort
                if (tcpListenerThread != null)
                {
                    // Give the thread time to finish naturally
                    if (tcpListenerThread.IsAlive)
                    {
                        tcpListenerThread.Join(1000); // Wait max 1 second
                    }
                    tcpListenerThread = null;
                }

                Debug.Log("[Unity TCP Server] Stopped");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Unity TCP Server] Error stopping server: {ex.Message}");
            }
        }

        public static void RestartTcpServer()
        {
            StopTcpServer();
            Thread.Sleep(1000);
            StartTcpServer();
        }

        public static bool IsServerRunning()
        {
            return isListening;
        }

        private static void ListenForClients()
        {
            tcpListener.Start();
            Debug.Log($"[Unity TCP Server] Listening for clients on port {port}");

            while (isListening)
            {
                try
                {
                    TcpClient client = tcpListener.AcceptTcpClient();
                    connectedClients.Add(client);
                    Debug.Log("[Unity TCP Server] Client connected");

                    Thread clientThread = new Thread(new ParameterizedThreadStart(HandleClientComm));
                    clientThread.IsBackground = true;
                    clientThread.Start(client);
                }
                catch (Exception ex)
                {
                    if (isListening && !(ex is ThreadAbortException))
                    {
                        Debug.LogError($"[Unity TCP Server] Error accepting client: {ex.Message}");
                    }
                    // Break out of loop if server is stopping
                    if (!isListening)
                    {
                        break;
                    }
                }
            }
        }

        private static void HandleClientComm(object client)
        {
            TcpClient tcpClient = (TcpClient)client;
            NetworkStream clientStream = null;
            
            try
            {
                clientStream = tcpClient.GetStream();
                byte[] message = new byte[4096];
                int bytesRead;

                while (isListening && tcpClient.Connected)
                {
                    bytesRead = 0;

                    try
                    {
                        bytesRead = clientStream.Read(message, 0, 4096);
                    }
                    catch (Exception ex)
                    {
                        if (isListening && !(ex is ThreadAbortException))
                        {
                            Debug.LogError($"[Unity TCP Server] Error reading from client: {ex.Message}");
                        }
                        break;
                    }

                    if (bytesRead == 0)
                    {
                        Debug.Log("[Unity TCP Server] Client disconnected");
                        break;
                    }

                    // Decode the message and trim any whitespace/newlines
                    string jsonMessage = Encoding.UTF8.GetString(message, 0, bytesRead).Trim();
                    Debug.Log($"[Unity TCP Server] Received: {jsonMessage}");

                    // Process the message
                    string response = ProcessMessage(jsonMessage);

                    // Send response back to client (without additional terminators - JSON is self-contained)
                    byte[] responseBytes = Encoding.UTF8.GetBytes(response);
                    try
                    {
                        clientStream.Write(responseBytes, 0, responseBytes.Length);
                        clientStream.Flush();
                        Debug.Log($"[Unity TCP Server] Sent response ({responseBytes.Length} bytes)");
                        Debug.Log($"[Unity TCP Server] Response content: {response.Substring(0, Math.Min(200, response.Length))}...");
                    }
                    catch (Exception ex)
                    {
                        if (isListening)
                        {
                            Debug.LogError($"[Unity TCP Server] Error sending response: {ex.Message}");
                        }
                        break;
                    }
                }
            }
            catch (Exception ex)
            {
                if (isListening && !(ex is ThreadAbortException))
                {
                    Debug.LogError($"[Unity TCP Server] Error in client communication: {ex.Message}");
                }
            }
            finally
            {
                // Clean up
                try
                {
                    connectedClients.Remove(tcpClient);
                    tcpClient?.Close();
                }
                catch { }
            }
        }

        private static string ProcessMessage(string message)
        {
            try
            {
                Debug.Log($"[Unity TCP Server] Processing message: {message}");
                
                // Handle ping command
                if (message.Trim() == "ping")
                {
                    Debug.Log("[Unity TCP Server] Handling ping command");
                    var response = new UnityResponse
                    {
                        status = "success",
                        result = new UnityResult
                        {
                            message = "pong"
                        }
                    };
                    
                    return JsonUtility.ToJson(response);
                }

                // Try to parse JSON command
                Debug.Log("[Unity TCP Server] Attempting to parse JSON command");
                var command = JsonUtility.FromJson<UnityCommand>(message);
                Debug.Log($"[Unity TCP Server] Parsed command type: {command?.type}");
                
                // Process different command types
                switch (command.type)
                {
                    case "focus_window":
                        return ProcessFocusWindow();
                    
                    case "read_console":
                        return ProcessReadConsole(command.parameters);
                    
                    case "get_hierarchy":
                        return ProcessGetHierarchy();
                    
                    case "get_scene_info":
                        return ProcessGetSceneInfo();
                    
                    case "open_mcp_bridge":
                        return ProcessOpenMcpBridge();
                    
                    default:
                        var errorResponse = new UnityResponse
                        {
                            status = "error",
                            error = "Unknown command type: " + command.type
                        };
                        
                        return JsonUtility.ToJson(errorResponse);
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Unity TCP Server] Error processing message: {ex.Message}");
                var errorResponse = new UnityResponse
                {
                    status = "error",
                    error = ex.Message
                };
                
                return JsonUtility.ToJson(errorResponse);
            }
        }

        private static string ProcessFocusWindow()
        {
            try
            {
                // Focus Unity window
                EditorWindow.FocusWindowIfItsOpen<SceneView>();
                var response = new UnityResponse
                {
                    status = "success",
                    result = new UnityResult
                    {
                        message = "Unity window focused"
                    }
                };
                
                return JsonUtility.ToJson(response);
            }
            catch (Exception ex)
            {
                var errorResponse = new UnityResponse
                {
                    status = "error",
                    error = ex.Message
                };
                
                return JsonUtility.ToJson(errorResponse);
            }
        }

        private static string ProcessReadConsole(CommandParams parameters)
        {
            try
            {
                // Try multiple common Unity log locations
                // Get paths safely from main thread
                string tempPath = Path.GetTempPath();
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                
                string[] logPaths = {
                    Path.Combine(tempPath, "Unity", "Editor.log"),
                    Path.Combine(localAppData, "Unity", "Editor", "Editor.log"),
                    Path.Combine(appData, "Unity", "Editor.log")
                };
                
                foreach (string logPath in logPaths)
                {
                    if (File.Exists(logPath))
                    {
                        try
                        {
                            // Use FileStream with FileShare.ReadWrite to avoid sharing violations
                            using (FileStream fs = new FileStream(logPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                            using (StreamReader reader = new StreamReader(fs))
                            {
                                List<string> lines = new List<string>();
                                string line;
                                while ((line = reader.ReadLine()) != null)
                                {
                                    lines.Add(line);
                                }
                                
                                int linesToRead = parameters.last_lines ?? 50;
                                
                                if (lines.Count > linesToRead)
                                {
                                    lines = lines.GetRange(lines.Count - linesToRead, linesToRead);
                                }
                                
                                string content = string.Join("\n", lines);
                                
                                // Use safe JSON formatting
                                string safeContent = content.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n").Replace("\r", "\\r").Replace("\t", "\\t");
                                string safeLogPath = logPath.Replace("\\", "\\\\").Replace("\"", "\\\"");
                                
                                return "{\"status\":\"success\",\"result\":{\"content\":\"Found log at: " + safeLogPath + "\\n\\n" + safeContent + "\"}}";
                            }
                        }
                        catch (IOException ex)
                        {
                            // If this specific log file is locked, try the next one
                            Debug.LogWarning($"[Unity TCP Server] Could not read log file {logPath}: {ex.Message}");
                            continue;
                        }
                    }
                }
                
                var noLogResponse = new UnityResponse
                {
                    status = "success",
                    result = new UnityResult
                    {
                        content = "No Unity log file found in any of the common locations"
                    }
                };
                
                return JsonUtility.ToJson(noLogResponse);
            }
            catch (Exception ex)
            {
                var errorResponse = new UnityResponse
                {
                    status = "error",
                    error = ex.Message
                };
                
                return JsonUtility.ToJson(errorResponse);
            }
        }

        private static string ProcessGetHierarchy()
        {
            try
            {
                var gameObjects = UnityEngine.Object.FindObjectsByType<GameObject>(FindObjectsSortMode.None);
                var hierarchyInfo = new List<string>();
                
                foreach (var go in gameObjects)
                {
                    if (go.transform.parent == null) // Only root objects
                    {
                        hierarchyInfo.Add($"{go.name} (Active: {go.activeInHierarchy})");
                    }
                }
                
                string content = string.Join("\n", hierarchyInfo);
                
                var response = new UnityResponse
                {
                    status = "success",
                    result = new UnityResult
                    {
                        content = content
                    }
                };
                
                return JsonUtility.ToJson(response);
            }
            catch (Exception ex)
            {
                var errorResponse = new UnityResponse
                {
                    status = "error",
                    error = ex.Message
                };
                
                return JsonUtility.ToJson(errorResponse);
            }
        }

        private static string ProcessGetSceneInfo()
        {
            try
            {
                var scene = UnityEngine.SceneManagement.SceneManager.GetActiveScene();
                string sceneInfo = $"Scene: {scene.name}\nPath: {scene.path}\nLoaded: {scene.isLoaded}\nRoot Objects: {scene.rootCount}";
                
                var response = new
                {
                    status = "success",
                    result = new
                    {
                        content = sceneInfo
                    }
                };
                
                return JsonUtility.ToJson(response);
            }
            catch (Exception ex)
            {
                var errorResponse = new UnityResponse
                {
                    status = "error",
                    error = ex.Message
                };
                
                return JsonUtility.ToJson(errorResponse);
            }
        }

        private static string ProcessOpenMcpBridge()
        {
            try
            {
                // Call SimpleMcpBridge.ShowWindow() directly
                SimpleMcpBridge.ShowWindow();
                var response = new UnityResponse
                {
                    status = "success",
                    result = new UnityResult
                    {
                        message = "Unity MCP Bridge window opened"
                    }
                };
                
                return JsonUtility.ToJson(response);
            }
            catch (Exception ex)
            {
                var errorResponse = new UnityResponse
                {
                    status = "error",
                    error = ex.Message
                };
                
                return JsonUtility.ToJson(errorResponse);
            }
        }
    }

    [Serializable]
    public class UnityCommand
    {
        public string type;
        public CommandParams parameters;
    }

    [Serializable]
    public class CommandParams
    {
        public string filter;
        public int? last_lines;
    }

    [Serializable]
    public class UnityResponse
    {
        public string status;
        public UnityResult result;
        public string error;
    }

    [Serializable]
    public class UnityResult
    {
        public string content;
        public string message;
    }
}