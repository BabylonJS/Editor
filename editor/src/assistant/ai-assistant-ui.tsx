import { Component, ReactNode } from "react";
import { IoCloseOutline, IoSend, IoSettingsOutline, IoCheckmarkCircle, IoCloseCircle, IoAddOutline } from "react-icons/io5";
import { VscLoading } from "react-icons/vsc";

import { Button } from "../ui/shadcn/ui/button";
import { Input } from "../ui/shadcn/ui/input";

import { AIAssistantClient } from "./ai-assistant-client";
import { createMeshTools } from "./tools/mesh-tool";
import { createMaterialTools } from "./tools/material-tool";
import { createLightTools } from "./tools/light-tool";
import { createCameraTools } from "./tools/camera-tool";
import { AIAssistantSettingsDialog, AIAssistantSettings, loadAIAssistantSettings } from "./ai-assistant-settings";

import { Editor } from "../editor/main";

const MESSAGES_KEY = "ai-assistant-messages";

export interface IAIAssistantUIProps {
  editor: Editor;
  onClose: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface IAIAssistantUIState {
  messages: Message[];
  input: string;
  loading: boolean;
  settings: AIAssistantSettings;
  showSettings: boolean;
  ollamaStatus: "checking" | "available" | "unavailable";
}

export class AIAssistantUI extends Component<IAIAssistantUIProps, IAIAssistantUIState> {
  private client: AIAssistantClient | null = null;
  private scrollRef: HTMLDivElement | null = null;

  constructor(props: IAIAssistantUIProps) {
    super(props);

    this.state = {
      messages: this._loadMessages(),
      input: "",
      loading: false,
      settings: loadAIAssistantSettings(),
      showSettings: false,
      ollamaStatus: "checking",
    };
  }

  componentDidMount(): void {
    this._initializeClient();
    this._checkOllamaStatus();
  }

  private _loadMessages(): Message[] {
    try {
      const stored = localStorage.getItem(MESSAGES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      }
    } catch (error) {
      console.error("Failed to load message history:", error);
    }
    return [];
  }

  private _saveMessages(messages: Message[]): void {
    try {
      const settings = this.state.settings;
      let messagesToSave = messages;

      if (!settings.keepAllHistory && messages.length > settings.messageHistoryLimit) {
        messagesToSave = messages.slice(-settings.messageHistoryLimit);
      }

      localStorage.setItem(MESSAGES_KEY, JSON.stringify(messagesToSave));
    } catch (error) {
      console.error("Failed to save message history:", error);
    }
  }

  private _clearMessages(): void {
    this.setState({ messages: [] });
    localStorage.removeItem(MESSAGES_KEY);
  }

  componentDidUpdate(_prevProps: IAIAssistantUIProps, prevState: IAIAssistantUIState): void {
    if (
      prevState.settings.model !== this.state.settings.model ||
      prevState.settings.temperature !== this.state.settings.temperature ||
      prevState.settings.ollamaUrl !== this.state.settings.ollamaUrl
    ) {
      this._initializeClient();
    }

    if (prevState.messages.length !== this.state.messages.length) {
      this._scrollToBottom();
      this._saveMessages(this.state.messages);
    }
  }

  private _initializeClient(): void {
    const scene = this.props.editor.layout.preview.scene;
    if (!scene) return;

    const onSceneChanged = () => {
      this.props.editor.layout.graph.refresh();
      this.props.editor.layout.inspector.forceUpdate();
    };

    const tools = [
      ...createMeshTools(scene, onSceneChanged),
      ...createMaterialTools(scene, onSceneChanged),
      ...createLightTools(scene, onSceneChanged),
      ...createCameraTools(scene, onSceneChanged),
    ];

    this.client = new AIAssistantClient(tools, {
      baseUrl: this.state.settings.ollamaUrl,
      model: this.state.settings.model,
      temperature: this.state.settings.temperature,
    });
  }

  private _scrollToBottom(): void {
    if (this.scrollRef) {
      this.scrollRef.scrollTop = this.scrollRef.scrollHeight;
    }
  }

  private async _checkOllamaStatus(): Promise<void> {
    this.setState({ ollamaStatus: "checking" });

    try {
      const response = await fetch(`${this.state.settings.ollamaUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        this.setState({ ollamaStatus: "available" });
      } else {
        this.setState({ ollamaStatus: "unavailable" });
      }
    } catch (error) {
      this.setState({ ollamaStatus: "unavailable" });
    }
  }

  private async _handleSend(): Promise<void> {
    if (!this.state.input.trim() || this.state.loading || !this.client) {
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: this.state.input,
      timestamp: new Date(),
    };

    this.setState({
      messages: [...this.state.messages, userMessage],
      input: "",
      loading: true,
    });

    try {
      const result = await this.client.chat({
        prompt: this.state.input,
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: result.response,
        timestamp: new Date(),
      };

      this.setState({
        messages: [...this.state.messages, assistantMessage],
        loading: false,
      });
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
      };

      this.setState({
        messages: [...this.state.messages, errorMessage],
        loading: false,
      });
    }
  }

  private _handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this._handleSend();
    }
  }

  public render(): ReactNode {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
        <div className="w-[600px] h-[700px] bg-background border border-border rounded-lg shadow-lg flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-4 flex-1">
              <h2 className="text-lg font-semibold">AI Assistant</h2>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {this.state.ollamaStatus === "checking" && (
                  <VscLoading className="w-4 h-4 animate-spin" />
                )}
                {this.state.ollamaStatus === "available" && (
                  <IoCheckmarkCircle className="w-4 h-4 text-green-500" title="Ollama is available" />
                )}
                {this.state.ollamaStatus === "unavailable" && (
                  <IoCloseCircle className="w-4 h-4 text-red-500" title="Ollama is unavailable" />
                )}
                <span>{this.state.settings.model}</span>
                <span>•</span>
                <span>T: {this.state.settings.temperature}</span>
              </div>
            </div>

            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => this._clearMessages()}
                title="New Chat"
              >
                <IoAddOutline className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => this.setState({ showSettings: true })}
                title="Settings"
              >
                <IoSettingsOutline className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={this.props.onClose}
                title="Close"
              >
                <IoCloseOutline className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div
            ref={(ref) => (this.scrollRef = ref)}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {this.state.messages.length === 0 && (
              <div className="text-center text-muted-foreground mt-8">
                <p>Welcome to the AI Assistant!</p>
                <p className="text-sm mt-2">Ask me to modify meshes, materials, lights, or cameras in your scene.</p>
              </div>
            )}

            {this.state.messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {this.state.loading && (
              <div className="flex justify-start">
                <div className="bg-muted p-3 rounded-lg">
                  <VscLoading className="w-5 h-5 animate-spin" />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={this.state.input}
                onChange={(e) => this.setState({ input: e.target.value })}
                onKeyPress={(e) => this._handleKeyPress(e)}
                placeholder="Ask me to modify your scene..."
                disabled={this.state.loading}
              />
              <Button
                onClick={() => this._handleSend()}
                disabled={this.state.loading || !this.state.input.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <IoSend className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {this.state.showSettings && (
          <AIAssistantSettingsDialog
            currentSettings={this.state.settings}
            onClose={() => this.setState({ showSettings: false })}
            onSave={(settings) => {
              this.setState({ settings });
              this._checkOllamaStatus();
            }}
          />
        )}
      </div>
    );
  }
}

