/**
 * The URL of the editor. The AI assistant of the editor starts its own server on a random port and gives its URL here.
 */
const editorUrl = process.env.BABYLONJS_EDITOR_MCP_URL ?? "http://localhost:3712";

/**
 * The token the editor expects in every request, when it was started with one.
 */
const editorToken = process.env.BABYLONJS_EDITOR_MCP_TOKEN;

export interface IGetFromEditorData {
	endpoint: string;
	[index: string]: any;
}

export interface IEditorResult {
	/**
	 * The parsed JSON response body returned by the editor handler (the tool's `data`),
	 * or `undefined` when the request failed before a body could be parsed.
	 */
	json: any;
	/**
	 * Pretty-printed JSON string of the response body, ready to be returned as text content.
	 */
	text: string;
	/**
	 * `true` when the HTTP status is not ok (editor handler threw) or when the fetch itself failed.
	 */
	isError: boolean;
}

export async function notifyAndGetResultFromEditor(endpoint: string, data?: any): Promise<IEditorResult> {
	let json: any;
	let text: string;
	let isError = false;

	try {
		const response = await fetch(`${editorUrl}/${endpoint}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(editorToken ? { "X-BabylonJS-Editor-Token": editorToken } : {}),
			},
			body: data
				? JSON.stringify({
						...data,
						endpoint,
					} satisfies IGetFromEditorData)
				: undefined,
		});

		json = await response.json();
		text = JSON.stringify(json, null, "\t");
		isError = !response.ok;
	} catch (e) {
		isError = true;
		text = (e as Error).message;
	}

	return {
		json,
		text,
		isError,
	};
}
