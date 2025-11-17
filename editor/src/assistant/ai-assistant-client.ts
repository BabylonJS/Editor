// @ts-ignore - ES module imports in CommonJS context
import { ChatOllama } from "@langchain/ollama";
// @ts-ignore - ES module imports in CommonJS context
import { HumanMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
// @ts-ignore - ES module imports in CommonJS context
import { DynamicStructuredTool } from "@langchain/core/tools";
// @ts-ignore - ES module imports in CommonJS context
import { StateGraph, END, Annotation } from "@langchain/langgraph";
// @ts-ignore - ES module imports in CommonJS context
import { ToolNode } from "@langchain/langgraph/prebuilt";

const DEFAULT_MODEL = "qwen2.5:3b";
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_BASE_URL = "http://localhost:11434";

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});

export interface AIAssistantConfig {
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatOptions {
  prompt: string;
  systemPrompt?: string;
}

export interface ChatResult {
  response: string;
  toolCalls: any[];
}

export class AIAssistantClient {
  private config: AIAssistantConfig;
  private tools: DynamicStructuredTool[];

  constructor(tools: DynamicStructuredTool[], config: AIAssistantConfig = {}) {
    this.tools = tools;
    this.config = {
      baseUrl: config.baseUrl || DEFAULT_BASE_URL,
      model: config.model || DEFAULT_MODEL,
      temperature: config.temperature ?? DEFAULT_TEMPERATURE,
      maxTokens: config.maxTokens || DEFAULT_MAX_TOKENS,
    };
  }

  async chat(options: ChatOptions): Promise<ChatResult> {
    const llm = new ChatOllama({
      model: this.config.model!,
      baseUrl: this.config.baseUrl!,
      temperature: this.config.temperature!,
      numPredict: this.config.maxTokens!,
    });

    const llmWithTools = llm.bindTools(this.tools as any);
    const toolNode = new ToolNode(this.tools as any);

    const callModel = async (state: typeof StateAnnotation.State) => {
      const response = await llmWithTools.invoke(state.messages);
      return { messages: [response] };
    };

    const shouldContinue = (state: typeof StateAnnotation.State) => {
      if (state.messages.length === 0) {
        return END;
      }
      const lastMessage = state.messages[state.messages.length - 1];
      if (!lastMessage) {
        return END;
      }
      return ("tool_calls" in lastMessage &&
              Array.isArray(lastMessage.tool_calls) &&
              lastMessage.tool_calls.length > 0) ? "tools" : END;
    };

    const workflow = new StateGraph(StateAnnotation)
      .addNode("agent", callModel)
      .addNode("tools", toolNode)
      .addEdge("__start__", "agent")
      .addConditionalEdges("agent", shouldContinue, {
        tools: "tools",
        [END]: END,
      })
      .addEdge("tools", "agent");

    const app = workflow.compile();

    const messages: BaseMessage[] = [];

    const systemPrompt = options.systemPrompt || `You are an AI assistant for the Babylon.js Editor. You can help users modify their 3D scenes by changing properties of meshes, materials, lights, and cameras.

When users ask you to modify objects in the scene:
1. First, list the available objects to see what's in the scene
2. Get the properties of specific objects if needed
3. Make the requested changes using the appropriate tools

Always provide clear feedback about what changes you made.`;

    messages.push(new SystemMessage(systemPrompt));
    messages.push(new HumanMessage(options.prompt));

    const result = await app.invoke({ messages });

    if (result.messages.length === 0) {
      throw new Error('No messages in response');
    }

    const lastMessage = result.messages[result.messages.length - 1];
    if (!lastMessage) {
      throw new Error('Last message is undefined');
    }

    const responseContent = typeof lastMessage.content === 'string'
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

    const toolCalls: any[] = [];
    result.messages.forEach((msg: any) => {
      if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
        toolCalls.push(...msg.tool_calls);
      }
    });

    return {
      response: responseContent,
      toolCalls,
    };
  }

  updateConfig(config: Partial<AIAssistantConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): AIAssistantConfig {
    return { ...this.config };
  }
}

