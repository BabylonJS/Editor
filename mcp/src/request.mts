const editorUrl = "http://localhost:3712";

export interface IGetFromEditorData {
	endpoint: string;
	[index: string]: any;
}

export async function notifyAndGetResultFromEditor(endpoint: string, data?: any) {
	let text: any;
	let response: Response;
	let isError = false;

	try {
		response = await fetch(`${editorUrl}/${endpoint}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: data
				? JSON.stringify({
						...data,
						endpoint,
					} satisfies IGetFromEditorData)
				: undefined,
		});

		text = JSON.stringify(await response.json(), null, "\t");
	} catch (e) {
		isError = true;
		text = e.message;
	}

	return {
		text,
		isError,
	};
}
