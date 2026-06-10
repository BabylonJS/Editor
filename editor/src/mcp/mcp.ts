import { createServer } from "http";

import { Scene } from "babylonjs";

import { Editor } from "../editor/main";

import { IMCPActionOptions } from "./action";

import { getSceneHierarchy } from "./scene/hierarchy";

export interface IEditorMCPDataType {
	endpoint: string;
	[index: string]: any;
}

export const MCPEndpoints: Record<string, (scene: Scene, data: any, options: IMCPActionOptions) => any> = {
	get_scene_hierarchy: (scene, data) => getSceneHierarchy(scene, data.rootNodeName),
};

export function initializeMcpServer(editor: Editor) {
	const server = createServer(async (req, res) => {
		const data = await new Promise<IEditorMCPDataType>((resolve, reject) => {
			let data = "";

			req.on("data", (chunk) => (data += chunk));
			req.on("end", () => resolve(JSON.parse(data)));
			req.on("error", reject);
		});

		const action = MCPEndpoints[data.endpoint];

		try {
			const result = action?.(editor.layout.preview.scene, data, { editor });

			res.writeHead(200);
			res.end(JSON.stringify(result));
		} catch (e) {
			res.writeHead(500);
			res.end(JSON.stringify({ ok: false, error: e.message }));
		}
	});

	server.listen(3712, "127.0.0.1", () => {
		editor.layout.console.log("MCP Server is listening on port 3712");
	});
}
