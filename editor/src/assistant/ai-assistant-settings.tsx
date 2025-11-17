import { Component, ReactNode } from "react";
import { IoCloseOutline, IoRefreshOutline } from "react-icons/io5";
import { VscLoading } from "react-icons/vsc";
import axios from "axios";

import { Button } from "../ui/shadcn/ui/button";
import { Input } from "../ui/shadcn/ui/input";
import { Label } from "../ui/shadcn/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/shadcn/ui/select";
import { Slider } from "../ui/shadcn/ui/slider";
import { Switch } from "../ui/shadcn/ui/switch";

const DEFAULT_OLLAMA_URL = "http://localhost:11434";
const SETTINGS_KEY = "ai-assistant-settings";

export interface AIAssistantSettings {
  ollamaUrl: string;
  model: string;
  temperature: number;
  messageHistoryLimit: number;
  keepAllHistory: boolean;
}

export interface IAIAssistantSettingsProps {
  onClose: () => void;
  onSave: (settings: AIAssistantSettings) => void;
  currentSettings: AIAssistantSettings;
}

interface IAIAssistantSettingsState {
  ollamaUrl: string;
  model: string;
  temperature: number;
  messageHistoryLimit: number;
  keepAllHistory: boolean;
  availableModels: string[];
  loading: boolean;
  error: string | null;
}

export class AIAssistantSettingsDialog extends Component<IAIAssistantSettingsProps, IAIAssistantSettingsState> {
  constructor(props: IAIAssistantSettingsProps) {
    super(props);

    this.state = {
      ollamaUrl: props.currentSettings.ollamaUrl,
      model: props.currentSettings.model,
      temperature: props.currentSettings.temperature,
      messageHistoryLimit: props.currentSettings.messageHistoryLimit,
      keepAllHistory: props.currentSettings.keepAllHistory,
      availableModels: [],
      loading: false,
      error: null,
    };
  }

  componentDidMount(): void {
    this._fetchModels();
  }

  private async _fetchModels(): Promise<void> {
    this.setState({ loading: true, error: null });

    try {
      const response = await axios.get(`${this.state.ollamaUrl}/api/tags`, {
        timeout: 5000,
      });

      const models = response.data.models?.map((m: any) => m.name) || [];

      this.setState({
        availableModels: models,
        loading: false,
        model: models.length > 0 && !models.includes(this.state.model) ? models[0] : this.state.model,
      });
    } catch (error) {
      this.setState({
        error: `Failed to fetch models: ${error instanceof Error ? error.message : String(error)}`,
        loading: false,
        availableModels: [],
      });
    }
  }

  private _handleSave(): void {
    const settings: AIAssistantSettings = {
      ollamaUrl: this.state.ollamaUrl,
      model: this.state.model,
      temperature: this.state.temperature,
      messageHistoryLimit: this.state.messageHistoryLimit,
      keepAllHistory: this.state.keepAllHistory,
    };

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    this.props.onSave(settings);
    this.props.onClose();
  }

  public render(): ReactNode {
    return (
      <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50">
        <div className="w-[500px] bg-background border border-border rounded-lg shadow-lg flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">AI Assistant Settings</h2>
            <Button variant="ghost" size="icon" onClick={this.props.onClose}>
              <IoCloseOutline className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label>Ollama URL</Label>
              <div className="flex gap-2">
                <Input
                  value={this.state.ollamaUrl}
                  onChange={(e) => this.setState({ ollamaUrl: e.target.value })}
                  placeholder="http://localhost:11434"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => this._fetchModels()}
                  disabled={this.state.loading}
                >
                  {this.state.loading ? (
                    <VscLoading className="w-4 h-4 animate-spin" />
                  ) : (
                    <IoRefreshOutline className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                URL of your Ollama instance
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                {this.state.error}
              </div>
            )}

            <div className="space-y-2">
              <Label>Model</Label>
              {this.state.availableModels.length > 0 ? (
                <div className="space-y-2">
                  <Select
                    value={this.state.model}
                    onValueChange={(value) => this.setState({ model: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a model">
                        {this.state.model || "Select a model"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] z-[10002]">
                      {this.state.availableModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {this.state.availableModels.length} models available
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={this.state.model}
                    onChange={(e) => this.setState({ model: e.target.value })}
                    placeholder="qwen2.5:3b"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter model name manually or refresh to load from Ollama
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Temperature</Label>
                <span className="text-sm text-muted-foreground">
                  {this.state.temperature.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[this.state.temperature]}
                onValueChange={([value]) => this.setState({ temperature: value })}
                min={0}
                max={2}
                step={0.1}
              />
              <p className="text-xs text-muted-foreground">
                Lower values are more focused, higher values are more creative
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Keep All Message History</Label>
                <Switch
                  checked={this.state.keepAllHistory}
                  onCheckedChange={(checked) => this.setState({ keepAllHistory: checked })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                When enabled, all messages are kept. When disabled, only the most recent messages are kept.
              </p>
            </div>

            {!this.state.keepAllHistory && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Message History Limit</Label>
                  <span className="text-sm text-muted-foreground">
                    {this.state.messageHistoryLimit}
                  </span>
                </div>
                <Slider
                  value={[this.state.messageHistoryLimit]}
                  onValueChange={([value]) => this.setState({ messageHistoryLimit: value })}
                  min={5}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Number of messages to keep in history
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 p-4 border-t border-border">
            <Button variant="outline" onClick={this.props.onClose}>
              Cancel
            </Button>
            <Button onClick={() => this._handleSave()}>
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export function loadAIAssistantSettings(): AIAssistantSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load AI Assistant settings:", error);
  }

  return {
    ollamaUrl: DEFAULT_OLLAMA_URL,
    model: "qwen2.5:3b",
    temperature: 0.7,
    messageHistoryLimit: 30,
    keepAllHistory: false,
  };
}

