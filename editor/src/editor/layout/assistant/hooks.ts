import { randomBytes } from "crypto";
import { IncomingMessage, ServerResponse } from "http";

import { isMCPTokenValid, listenMCPServer, MCPTokenHeader } from "../../../mcp/server";

import { compareVersions } from "./claude";

/**
 * Defines what the AI assistant is doing: nothing, working on a request of the user, or waiting for the user to answer
 * it, to allow a tool for example.
 */
export type EditorAssistantWorkState = "idle" | "working" | "waiting";

/**
 * Defines the oldest version of Claude Code the assistant follows with hooks. HTTP hooks exist since 2.1.63, and before
 * 2.1.101 a hook event Claude Code didn't know made it ignore the whole settings file, permissions included.
 */
export const assistantHooksMinimumClaudeVersion = "2.1.101";

/**
 * Defines the hook events of Claude Code the assistant follows to know what it is doing. Claude Code sends each of them
 * to the HTTP server of the assistant as a POST request on "/<event>".
 */
export const assistantHookEvents = [
	"UserPromptSubmit",
	"UserPromptExpansion",
	"PermissionRequest",
	"Elicitation",
	"ElicitationResult",
	"PostToolUse",
	"PostToolUseFailure",
	"Notification",
	"Stop",
	"StopFailure",
	"SessionEnd",
];

/**
 * Defines the types of the notifications Claude Code sends while it waits for the user to answer.
 */
const inputNotificationTypes = ["permission_prompt", "elicitation_dialog", "elicitation_url_dialog"];

/**
 * Defines the maximum size, in bytes, of the body of a hook event the assistant reads. The fields it needs are small,
 * while the events of the tools carry their whole result, like a screenshot.
 */
const maxHookBodySize = 64 * 1024;

/**
 * Defines the fields of the input of the hook events the assistant reads.
 */
export interface IAssistantHookInput {
	/**
	 * Defines the type of the notification, for "Notification" events.
	 */
	notification_type?: string;
	/**
	 * Defines the text of the notification, for "Notification" events.
	 */
	message?: string;
	/**
	 * Defines the type of the error, for "StopFailure" events.
	 */
	error?: string;
	/**
	 * Defines the last message of the turn, which is the text of the error for "StopFailure" events.
	 */
	last_assistant_message?: string;
}

export interface IAssistantHooksServer {
	/**
	 * Defines the URL of the server, on the loopback interface.
	 */
	readonly url: string;
	/**
	 * Defines the token the requests must send in the "x-babylonjs-editor-token" header.
	 */
	readonly token: string;
	/**
	 * Stops listening.
	 */
	close(): Promise<void>;
}

/**
 * Returns wether or not the given version of Claude Code can tell the assistant what it is doing through hooks.
 * @param claudeVersion defines the version of Claude Code, like "2.1.283".
 */
export function supportsAssistantHooks(claudeVersion: string): boolean {
	return compareVersions(claudeVersion, assistantHooksMinimumClaudeVersion) >= 0;
}

/**
 * Returns wether or not the given "Notification" hook event tells that Claude Code waits for the user to answer.
 * @param input defines the input of the hook event.
 */
export function isAssistantInputNotification(input: IAssistantHookInput): boolean {
	return inputNotificationTypes.includes(input.notification_type ?? "");
}

/**
 * Returns what the assistant is doing after the given hook event of Claude Code.
 * @param state defines what the assistant was doing.
 * @param event defines the name of the hook event.
 * @param input defines the input of the hook event.
 */
export function getAssistantWorkStateAfterHook(state: EditorAssistantWorkState, event: string, input: IAssistantHookInput): EditorAssistantWorkState {
	switch (event) {
		case "UserPromptSubmit":
		case "UserPromptExpansion":
			return "working";

		// Only while working: a background task can ask after the request ended, and nothing would tell when it is done.
		case "PermissionRequest":
		case "Elicitation":
			return state === "working" ? "waiting" : state;

		case "Notification":
			if (input.notification_type === "idle_prompt") {
				return "idle";
			}

			return state === "working" && isAssistantInputNotification(input) ? "waiting" : state;

		// A tool ran: the user answered.
		case "PostToolUse":
		case "PostToolUseFailure":
		case "ElicitationResult":
			return state === "waiting" ? "working" : state;

		case "Stop":
		case "StopFailure":
		case "SessionEnd":
			return "idle";

		default:
			return state;
	}
}

/**
 * Returns what the assistant is doing after the user typed the given data in its terminal. Claude Code stops the
 * current request, without running any hook, when the user presses Escape or Ctrl+C.
 * @param state defines what the assistant was doing.
 * @param data defines the data typed by the user.
 */
export function getAssistantWorkStateAfterInput(state: EditorAssistantWorkState, data: string): EditorAssistantWorkState {
	return data === "\x1b" || data === "\x03" ? "idle" : state;
}

function readHookBody(req: IncomingMessage): Promise<string | null> {
	return new Promise<string | null>((resolve) => {
		let size = 0;
		let chunks: Buffer[] | null = [];

		req.on("data", (chunk: Buffer) => {
			size += chunk.length;

			// Keeps reading until the end without keeping the body: Claude Code waits for the answer.
			if (size > maxHookBodySize) {
				chunks = null;
			}

			chunks?.push(chunk);
		});

		req.on("end", () => resolve(chunks ? Buffer.concat(chunks).toString("utf-8") : null));
		req.on("error", () => resolve(null));
	});
}

function parseHookInput(body: string | null): IAssistantHookInput {
	try {
		const input = body ? JSON.parse(body) : null;
		return input && typeof input === "object" ? input : {};
	} catch (e) {
		return {};
	}
}

/**
 * Creates the function handling the hook events Claude Code sends to the assistant. It always answers with an empty
 * body, which lets Claude Code go on as if there was no hook.
 * @param token defines the token requests must send in the "x-babylonjs-editor-token" header.
 * @param onHook defines the function called with the name and the input of each hook event.
 */
export function createAssistantHooksListener(
	token: string,
	onHook: (event: string, input: IAssistantHookInput) => void
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
	return async (req, res) => {
		const event = new URL(req.url ?? "/", "http://127.0.0.1").pathname.substring(1);

		// Like the MCP server of the editor: only Claude Code knows the token, and web pages are always rejected.
		let status = 200;
		if (req.headers.origin) {
			status = 403;
		} else if (!isMCPTokenValid(req.headers[MCPTokenHeader], token)) {
			status = 401;
		} else if (req.method !== "POST") {
			status = 405;
		} else if (!assistantHookEvents.includes(event)) {
			status = 404;
		}

		const body = await readHookBody(req);

		res.writeHead(status);
		res.end();

		if (status === 200) {
			onHook(event, parseHookInput(body));
		}
	};
}

/**
 * Starts the HTTP server Claude Code sends the hook events of the assistant to. It only listens on the loopback
 * interface, on a port chosen by the system, and expects a new random token.
 * @param onHook defines the function called with the name and the input of each hook event.
 */
export async function startAssistantHooksServer(onHook: (event: string, input: IAssistantHookInput) => void): Promise<IAssistantHooksServer> {
	const token = randomBytes(32).toString("hex");
	const { server, port } = await listenMCPServer(createAssistantHooksListener(token, onHook), 0);

	return {
		url: `http://127.0.0.1:${port}`,
		token,
		close: () =>
			new Promise<void>((resolve) => {
				server.close(() => resolve());
				server.closeAllConnections?.();
			}),
	};
}
