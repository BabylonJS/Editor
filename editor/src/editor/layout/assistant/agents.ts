import { findCodexExecutable } from "./codex";
import { findAntigravityExecutable } from "./antigravity";
import { findClaudeExecutable } from "./claude";
import { IAssistantExecutable } from "./executable";

/**
 * Defines the coding agents the AI assistant can run.
 */
export type EditorAssistantAgentId = "claude" | "codex" | "antigravity";

export interface IEditorAssistantAgent {
	/**
	 * Defines the identifier of the agent, used to remember the choice of the user.
	 */
	id: EditorAssistantAgentId;
	/**
	 * Defines the name of the agent shown to the user.
	 */
	name: string;
	/**
	 * Defines the name of the model the agent talks with, shown to the user.
	 */
	modelName: string;
	/**
	 * Defines the account the user signs in with in the agent.
	 */
	account: string;
	/**
	 * Defines the desktop app that comes with the agent, if any.
	 */
	desktopApp: string | null;
	/**
	 * Defines the URL of the documentation explaining how to install the agent.
	 */
	setupUrl: string;
	/**
	 * Returns the command installing the agent, run in PowerShell on Windows and in a terminal elsewhere.
	 * @param windows defines wether or not the user is on Windows.
	 */
	getInstallCommand(windows: boolean): string;
	/**
	 * Finds the executable of the agent installed on this computer.
	 * @param customPath defines the path of the executable chosen by the user, if any.
	 */
	findExecutable(customPath?: string | null): Promise<IAssistantExecutable | null>;
}

export const assistantAgents: IEditorAssistantAgent[] = [
	{
		id: "claude",
		name: "Claude Code",
		modelName: "Claude",
		account: "Claude account",
		desktopApp: "the Claude desktop app",
		setupUrl: "https://code.claude.com/docs/en/setup",
		getInstallCommand: (windows) => (windows ? "irm https://claude.ai/install.ps1 | iex" : "curl -fsSL https://claude.ai/install.sh | bash"),
		findExecutable: (customPath) => findClaudeExecutable(customPath),
	},
	{
		id: "codex",
		name: "Codex",
		modelName: "Codex",
		account: "ChatGPT account or OpenAI API key",
		desktopApp: null,
		setupUrl: "https://developers.openai.com/codex/cli",
		getInstallCommand: (windows) => (windows ? "irm https://chatgpt.com/codex/install.ps1 | iex" : "curl -fsSL https://chatgpt.com/codex/install.sh | sh"),
		findExecutable: (customPath) => findCodexExecutable(customPath),
	},
	{
		// Gemini CLI no longer serves personal Google accounts: Antigravity CLI replaces it.
		id: "antigravity",
		name: "Antigravity CLI",
		modelName: "Gemini",
		account: "Google account",
		desktopApp: null,
		setupUrl: "https://antigravity.google/docs/cli/install/",
		getInstallCommand: (windows) => (windows ? "irm https://antigravity.google/cli/install.ps1 | iex" : "curl -fsSL https://antigravity.google/cli/install.sh | bash"),
		findExecutable: (customPath) => findAntigravityExecutable(customPath),
	},
];

/**
 * Returns the agent of the given identifier, or Claude Code when it is not known.
 * @param id defines the identifier of the agent, as stored in the preferences of the user.
 */
export function getAssistantAgent(id: string | null): IEditorAssistantAgent {
	return assistantAgents.find((agent) => agent.id === id) ?? assistantAgents[0];
}
