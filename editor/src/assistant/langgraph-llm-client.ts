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
import { z } from "zod";
import axios from "axios";

interface ToolParameter {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  enum?: string[];
}

interface ToolDefinitionResponse {
  name: string;
  description: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  parameters: ToolParameter[];
}

interface ToolsDefinitionResponse {
  tools: ToolDefinitionResponse[];
}

const DEFAULT_MAX_TOKENS = 2048;

/**
 * LLM Client Interface
 * Defines the contract for LLM client implementations
 */
export interface LLMClient {
  chat(options: {
    model: string;
    temperature: number;
    prompt: string;
    systemPrompt?: string;
    toolsUrl?: string;
    image?: {
      fileName: string;
      mimeType: string;
      data: string; // Base64 encoded image data
    };
  }): Promise<string>;
}

/**
 * LLM Configuration Interface
 */
export interface LLMConfig {
  baseUrl?: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
}

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});

function createZodSchema(parameters: ToolDefinitionResponse["parameters"]): z.ZodObject<any> {
  const schemaObj: Record<string, z.ZodTypeAny> = {};
  
  // Validate that parameters is an array
  if (!Array.isArray(parameters)) {
    console.warn('Tool parameters is not an array, using empty schema', parameters);
    return z.object({}) as z.ZodObject<any>;
  }
  
  parameters.forEach(param => {
    // Validate parameter structure
    if (!param || typeof param !== 'object' || !param.name) {
      console.warn('Invalid parameter structure, skipping', param);
      return;
    }
    
    let field: z.ZodTypeAny;
    if (param.enum) {
      field = z.enum(param.enum as [string, ...string[]]);
    } else if (param.type === 'number') {
      field = z.number();
    } else if (param.type === 'boolean') {
      field = z.boolean();
    } else {
      field = z.string();
    }
    field = field.describe(param.description || '');
    if (!param.required) {
      field = field.optional();
    }
    schemaObj[param.name] = field;
  });
  return z.object(schemaObj) as z.ZodObject<any>;
}

function createDynamicTool(toolDef: ToolDefinitionResponse, baseUrl: string): any {
  // Validate required fields
  if (!toolDef.endpoint || typeof toolDef.endpoint !== 'string') {
    throw new Error(`Tool ${toolDef.name} is missing a valid endpoint`);
  }
  if (!toolDef.method || !['GET', 'POST', 'PUT', 'DELETE'].includes(toolDef.method)) {
    throw new Error(`Tool ${toolDef.name} has invalid method: ${toolDef.method}`);
  }

  // @ts-ignore - Type instantiation is excessively deep (TypeScript limitation with complex generics)
  const schema = createZodSchema(toolDef.parameters);
  // @ts-ignore - Type instantiation is excessively deep (TypeScript limitation with complex generics)
  return new DynamicStructuredTool({
    name: toolDef.name,
    description: toolDef.description,
    schema,
    func: async (input: Record<string, any>) => {
      // Resolve endpoint relative to base URL
      const endpointUrl = toolDef.endpoint.startsWith('http')
        ? toolDef.endpoint
        : `${baseUrl}${toolDef.endpoint}`;
      let response;
      switch (toolDef.method) {
        case "GET":
          response = await axios.get(endpointUrl, { params: input });
          break;
        case "POST":
          response = await axios.post(endpointUrl, input);
          break;
        case "PUT":
          response = await axios.put(endpointUrl, input);
          break;
        case "DELETE":
          response = await axios.delete(endpointUrl, { data: input });
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${toolDef.method}`);
      }
      return JSON.stringify(response.data);
    },
  });
}

export class LangGraphLLMClient implements LLMClient {
	private config: LLMConfig;

	constructor(config: LLMConfig = {}) {
		this.config = config;
	}

  async chat(options: {
    model: string;
    temperature: number;
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    image?: {
      fileName: string;
      mimeType: string;
      data: string; // Base64 encoded image data
    };
    toolsUrl?: string;
  }): Promise<string> {
    try {
      // Check if tools should be used
      if (options.toolsUrl && options.toolsUrl.length > 0) {
        return await this.chatWithTools({
          model: options.model,
          temperature: options.temperature,
          prompt: options.prompt,
          systemPrompt: options.systemPrompt,
          maxTokens: options.maxTokens,
          image: options.image,
          toolsUrl: options.toolsUrl
        }, false) as string;
      } else {
        return await this.chatWithoutTools(options, false) as string;
      }
    } catch (error) {
      console.error('LangGraph LLM call failed:', error);
      throw error;
    }
  }

  async chatWithDetails(options: {
    model: string;
    temperature: number;
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    image?: {
      fileName: string;
      mimeType: string;
      data: string;
    };
    toolsUrl?: string;
  }): Promise<{
    response: string;
    metadata: {
      model: string;
      temperature: number;
      maxTokens?: number;
      messages: any[];
      toolCalls?: any[];
      executionTime: number;
      timestamp: string;
    };
  }> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      let response: string;
      let allMessages: any[] = [];
      let toolCalls: any[] = [];

      // Check if tools should be used
      if (options.toolsUrl && options.toolsUrl.length > 0) {
        const result = await this.chatWithTools({
          model: options.model,
          temperature: options.temperature,
          prompt: options.prompt,
          systemPrompt: options.systemPrompt,
          maxTokens: options.maxTokens,
          image: options.image,
          toolsUrl: options.toolsUrl
        }, true) as { response: string; messages: any[]; toolCalls: any[] };
        response = result.response;
        allMessages = result.messages;
        toolCalls = result.toolCalls;
      } else {
        const result = await this.chatWithoutTools({
          model: options.model,
          temperature: options.temperature,
          prompt: options.prompt,
          systemPrompt: options.systemPrompt,
          maxTokens: options.maxTokens,
          image: options.image
        }, true) as { response: string; messages: any[] };
        response = result.response;
        allMessages = result.messages;
      }

      const executionTime = Date.now() - startTime;

      return {
        response,
        metadata: {
          model: options.model.trim(),
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          messages: allMessages,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          executionTime,
          timestamp,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Create a detailed error object
      const errorDetails: any = {
        message: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.name : 'Error',
        stack: error instanceof Error ? error.stack : undefined,
        cause: error instanceof Error ? error.cause : undefined,
        metadata: {
          model: options.model.trim(),
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          messages: [],
          executionTime,
          timestamp,
        },
      };

      // If error is already an object with metadata, merge it
      if (typeof error === 'object' && error !== null && 'metadata' in error) {
        errorDetails.metadata = { ...errorDetails.metadata, ...(error as any).metadata };
      }

      // Create a proper Error object with the details attached
      const enhancedError = new Error(errorDetails.message);
      (enhancedError as any).details = errorDetails;
      throw enhancedError;
    }
  }

  /**
   * Create an LLM instance with the specified configuration
   */
  private createLLMInstance(options: {
    model: string;
    temperature: number;
    maxTokens?: number;
  }): ChatOllama {
    return new ChatOllama({
      model: options.model || this.config.defaultModel || "qwen3:1.7b",
      baseUrl: this.config.baseUrl || "http://localhost:11434",
      temperature: options.temperature !== undefined ? options.temperature : this.config.defaultTemperature || 0.7,
      numPredict: options.maxTokens || this.config.defaultMaxTokens || DEFAULT_MAX_TOKENS,
    });
  }

  /**
   * Build messages array from prompt, system prompt, and optional image
   */
  private buildMessages(options: {
    prompt: string;
    systemPrompt?: string;
    image?: {
      fileName: string;
      mimeType: string;
      data: string;
    };
  }): BaseMessage[] {
    const messages: BaseMessage[] = [];

    if (options.systemPrompt) {
      messages.push(new SystemMessage(options.systemPrompt));
    }

    if (options.image) {
      const imageDataUri = `data:${options.image.mimeType};base64,${options.image.data}`;
      messages.push(new HumanMessage({
        content: [
          { type: 'text', text: options.prompt },
          { type: 'image_url', image_url: { url: imageDataUri } }
        ] as any
      }));
    } else {
      messages.push(new HumanMessage(options.prompt));
    }

    return messages;
  }

  /**
   * Serialize messages for metadata
   */
  private serializeMessages(messages: BaseMessage[], response?: any): any[] {
    const serialized = messages.map(msg => ({
      type: msg.constructor.name,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      additional_kwargs: (msg as any).additional_kwargs || {},
    }));

    if (response) {
      const responseContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      serialized.push({
        type: 'AIMessage',
        content: responseContent,
        additional_kwargs: (response as any).additional_kwargs || {},
        response_metadata: (response as any).response_metadata || {},
      } as any);
    }

    return serialized;
  }

  private async chatWithoutTools(
    options: {
      model: string;
      temperature: number;
      prompt: string;
      systemPrompt?: string;
      maxTokens?: number;
      image?: {
        fileName: string;
        mimeType: string;
        data: string;
      };
    },
    detailed: boolean = false
  ): Promise<string | { response: string; messages: any[] }> {
    const llm = this.createLLMInstance({
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });

    const messages = this.buildMessages({
      prompt: options.prompt,
      systemPrompt: options.systemPrompt,
      image: options.image,
    });

		// @ts-ignore
		const response = await llm.invoke(messages);
		const responseContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

    if (detailed) {
      return {
        response: responseContent,
        messages: this.serializeMessages(messages, response),
      };
    }

    return responseContent;
  }

  private async chatWithTools(
    options: {
      model: string;
      temperature: number;
      prompt: string;
      systemPrompt?: string;
      maxTokens?: number;
      image?: {
        fileName: string;
        mimeType: string;
        data: string;
      };
      toolsUrl: string;
    },
    detailed: boolean = false
  ): Promise<string | { response: string; messages: any[]; toolCalls: any[] }> {
    // Fetch tool definitions
    const response = await axios.get<ToolsDefinitionResponse>(options.toolsUrl);
    const toolDefs = response.data.tools;

    // Extract base URL from toolsUrl
    const toolsUrlObj = new URL(options.toolsUrl);
    const baseUrl = `${toolsUrlObj.protocol}//${toolsUrlObj.host}`;

    // Create tools with error handling
    const tools: any[] = [];
    const toolErrors: string[] = [];
    for (const def of toolDefs) {
      try {
        const tool = createDynamicTool(def, baseUrl);
        tools.push(tool);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to create tool ${def.name}:`, errorMessage);
        toolErrors.push(`Tool ${def.name}: ${errorMessage}`);
      }
    }

    if (tools.length === 0) {
      throw new Error(`No valid tools could be created. Errors: ${toolErrors.join('; ')}`);
    }

    if (toolErrors.length > 0) {
      console.warn(`Some tools failed to load: ${toolErrors.join('; ')}`);
    }

    // Create LLM with tools
    const llm = this.createLLMInstance({
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });

    // Type assertions needed due to TypeScript's limitations with complex generic types in LangChain
    const llmWithTools = llm.bindTools(tools as any);
    const toolNode = new ToolNode(tools as any);

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

    // Enhanced system prompt with date handling rules
    let enhancedSystemPrompt = options.systemPrompt || '';
    
    // Add critical date handling instructions if tools are being used
    if (tools.length > 0 && !enhancedSystemPrompt.includes('get_current_date')) {
      const dateHandlingRules = `

CRITICAL DATE HANDLING RULES - YOU MUST FOLLOW THESE:
1. When the user mentions "today", "tomorrow", scheduling, or creating appointments:
   - YOU MUST call get_current_date or get_current_datetime FIRST
   - Extract the "today" or "now" field from the response
   - Use THAT EXACT date value to create activities/appointments
   - NEVER use hardcoded dates, dates from training data, or dates with years before 2024
   
2. Example workflow:
   - User: "Create an appointment for today"
   - Step 1: Call get_current_date → Get today="2025-11-09"
   - Step 2: Use "2025-11-09T14:00:00Z" (or appropriate time) for create_activity
   
3. WRONG: Using "2023-10-15T14:00:00Z" (old year, hardcoded)
   RIGHT: Call get_current_date first, then use the returned date

If you try to create an activity with a date from 2023 or earlier, it will be REJECTED.`;

      enhancedSystemPrompt = enhancedSystemPrompt + dateHandlingRules;
    }

    // Build messages
    const messages = this.buildMessages({
      prompt: options.prompt,
      systemPrompt: enhancedSystemPrompt,
      image: options.image,
    });

    const result = await app.invoke({ messages });

    // Extract the final response
    if (result.messages.length === 0) {
      throw new Error('No messages in response');
    }
    const lastMessage = result.messages[result.messages.length - 1];
    if (!lastMessage) {
      throw new Error('Last message is undefined');
    }
    const responseContent = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);

    // Collect all tool calls
    const toolCalls: any[] = [];
    result.messages.forEach((msg: any) => {
      if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
        toolCalls.push(...msg.tool_calls);
      }
    });

    // Serialize messages for metadata (with tool calls support)
    const serializedMessages = result.messages.map((msg: any) => ({
      type: msg.constructor?.name || 'Message',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      tool_calls: msg.tool_calls || undefined,
      additional_kwargs: msg.additional_kwargs || {},
      response_metadata: msg.response_metadata || {},
    }));

    const result_obj = {
      response: responseContent,
      messages: serializedMessages,
      toolCalls,
    };

    if (detailed) {
      return result_obj;
    }

    return responseContent;
  }

  getConfig(): LLMConfig {
    return { ...this.config };
  }

	updateConfig(config: Partial<LLMConfig>): void {
		this.config = { ...this.config, ...config };
	}

  getBaseUrl(): string {
    return this.config.baseUrl || 'http://localhost:11434';
  }

  setBaseUrl(baseUrl: string): void {
    this.config.baseUrl = baseUrl;
  }

  async checkStatus(): Promise<boolean> {
    try {
      // Check if Ollama is accessible by making a simple request
      const baseUrl = this.config.baseUrl || 'http://localhost:11434';
      await axios.get(`${baseUrl}/api/tags`);
      return true;
    } catch (error) {
      return false;
    }
  }
}
