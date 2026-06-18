import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { notifyAndGetResultFromEditor } from "../request.mjs";

/**
 * Forwards the given endpoint and arguments to the editor and maps the result to a text
 * `CallToolResult`. Use this for every tool that returns JSON/textual data.
 */
export async function callTextTool(endpoint: string, args?: any): Promise<CallToolResult> {
	const result = await notifyAndGetResultFromEditor(endpoint, args);
	return {
		isError: result.isError,
		content: [
			{
				type: "text",
				text: result.text,
			},
		],
	};
}

/**
 * Forwards the given endpoint and arguments to the editor and maps the result to an image
 * `CallToolResult`. The editor handler is expected to return `{ imageBase64, mimeType }`.
 * Falls back to a text error when the image payload is missing or the request failed.
 */
export async function callImageTool(endpoint: string, args?: any): Promise<CallToolResult> {
	const result = await notifyAndGetResultFromEditor(endpoint, args);

	const imageBase64 = result.json?.imageBase64;
	const mimeType = result.json?.mimeType;

	if (result.isError || !imageBase64 || !mimeType) {
		return {
			isError: true,
			content: [
				{
					type: "text",
					text: result.text,
				},
			],
		};
	}

	return {
		content: [
			{
				type: "image",
				data: imageBase64,
				mimeType,
			},
		],
	};
}
