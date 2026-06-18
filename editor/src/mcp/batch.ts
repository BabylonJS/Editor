import { Scene } from "babylonjs";

import { IMCPActionOptions } from "./action";

/**
 * Defines the shape of a single action in an execute_batch request.
 */
export interface IMCPBatchAction {
	endpoint: string;
	data: any;
}

/**
 * Executes an ordered list of actions in a single round-trip.
 * Each action runs the same handler as its standalone endpoint.
 * Stops on the first error unless `continueOnError` is true.
 * A single graph + assets refresh is performed at the end for performance.
 * @param endpoints defines the map of all registered MCP endpoints.
 */
export function createBatchHandler(
	endpoints: Record<string, (scene: Scene, data: any, options: IMCPActionOptions) => any>
): (scene: Scene, data: any, options: IMCPActionOptions) => Promise<any> {
	return async (scene: Scene, data: any, options: IMCPActionOptions): Promise<any> => {
		const actions: IMCPBatchAction[] = data.actions ?? [];
		const continueOnError = data.continueOnError ?? false;

		const results: { endpoint: string; ok: boolean; data?: any; error?: string }[] = [];

		for (const action of actions) {
			const handler = endpoints[action.endpoint];

			if (!handler) {
				results.push({ endpoint: action.endpoint, ok: false, error: `Unknown endpoint: ${action.endpoint}` });
				if (!continueOnError) {
					break;
				}
				continue;
			}

			try {
				const result = await handler(scene, action.data ?? {}, options);
				results.push({ endpoint: action.endpoint, ok: true, data: result });
			} catch (e) {
				results.push({ endpoint: action.endpoint, ok: false, error: e instanceof Error ? e.message : String(e) });
				if (!continueOnError) {
					break;
				}
			}
		}

		// Single refresh at the end of the batch for performance.
		await options.editor.layout.graph.refresh();
		options.editor.layout.assets.refresh();

		return { results };
	};
}
