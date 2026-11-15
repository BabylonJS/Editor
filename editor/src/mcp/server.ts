import { timingSafeEqual } from "crypto";
import { createServer, IncomingMessage, Server, ServerResponse } from "http";

/**
 * Defines the name of the HTTP header the MCP server sends the token of the editor in.
 */
export const MCPTokenHeader = "x-babylonjs-editor-token";

/**
 * Defines the maximum size, in bytes, of the body of a request sent to the editor.
 */
export const MCPMaxRequestBodySize = 32 * 1024 * 1024;

export interface IMCPRequestListenerOptions {
	/**
	 * Defines the token requests must send in the "x-babylonjs-editor-token" header. Null accepts every request.
	 */
	token: string | null;
	/**
	 * Returns the function handling the given endpoint, or undefined when the endpoint doesn't exist.
	 */
	getAction: (endpoint: string) => ((data: any) => any) | undefined;
	/**
	 * Called each time a request for an existing endpoint is about to be handled.
	 */
	onRequest?: (endpoint: string) => void;
	/**
	 * Called each time a request for an existing endpoint was handled, successfully or not.
	 */
	onResponse?: (endpoint: string, succeeded: boolean) => void;
}

/**
 * Returns wether or not the given token matches the expected one, in a time that doesn't depend on where they differ.
 * @param received defines the token received with the request.
 * @param expected defines the token of the editor.
 */
export function isMCPTokenValid(received: string | string[] | undefined, expected: string): boolean {
	if (typeof received !== "string") {
		return false;
	}

	const receivedBuffer = Buffer.from(received);
	const expectedBuffer = Buffer.from(expected);

	return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function readRequestBody(req: IncomingMessage): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		let size = 0;
		const chunks: Buffer[] = [];

		req.on("data", (chunk: Buffer) => {
			size += chunk.length;
			if (size > MCPMaxRequestBodySize) {
				reject(new Error("Request body is too large."));
				req.destroy();
				return;
			}

			chunks.push(chunk);
		});

		req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
		req.on("error", reject);
	});
}

function respond(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { "Content-Type": "application/json" });
	res.end(JSON.stringify(body ?? null));
}

/**
 * Creates the function handling the requests sent to the editor by its MCP server. Each request is a POST whose
 * JSON body holds the name of the endpoint in "endpoint" and the arguments of the tool.
 * @param options defines the options of the listener.
 */
export function createMCPRequestListener(options: IMCPRequestListenerOptions): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
	return async (req, res) => {
		// Requests sent by web pages carry an "Origin" header, requests of the MCP server never do: a page opened in a
		// browser must never be able to drive the editor.
		if (req.headers.origin) {
			req.resume();
			return respond(res, 403, { error: "Forbidden" });
		}

		if (options.token && !isMCPTokenValid(req.headers[MCPTokenHeader], options.token)) {
			req.resume();
			return respond(res, 401, { error: "Unauthorized" });
		}

		if (req.method !== "POST") {
			req.resume();
			return respond(res, 405, { error: "Method not allowed" });
		}

		let data: any;
		try {
			data = JSON.parse(await readRequestBody(req));
		} catch (e) {
			return respond(res, 400, { error: e instanceof Error ? e.message : String(e) });
		}

		if (!data || typeof data.endpoint !== "string") {
			return respond(res, 400, { error: "Missing endpoint." });
		}

		const action = options.getAction(data.endpoint);
		if (!action) {
			return respond(res, 404, { error: `Unknown endpoint: ${data.endpoint}` });
		}

		options.onRequest?.(data.endpoint);

		try {
			const result = await action(data);
			options.onResponse?.(data.endpoint, true);

			respond(res, 200, result);
		} catch (e) {
			options.onResponse?.(data.endpoint, false);

			respond(res, 500, { error: e instanceof Error ? e.message : String(e) });
		}
	};
}

/**
 * Starts listening with the given request listener on the loopback interface only.
 * @param listener defines the function handling the requests.
 * @param port defines the port to listen on. 0 lets the system pick a free one.
 * @returns the server and the port it listens on.
 */
export function listenMCPServer(listener: (req: IncomingMessage, res: ServerResponse) => Promise<void>, port: number): Promise<{ server: Server; port: number }> {
	return new Promise((resolve, reject) => {
		const server = createServer((req, res) => {
			listener(req, res).catch((e) => {
				if (!res.headersSent) {
					respond(res, 500, { error: e instanceof Error ? e.message : String(e) });
				}
			});
		});

		server.once("error", reject);
		server.listen(port, "127.0.0.1", () => {
			server.off("error", reject);

			const address = server.address();
			resolve({
				server,
				port: typeof address === "object" && address ? address.port : port,
			});
		});
	});
}
