import { relative, dirname } from "path/posix";

import { Scene } from "babylonjs";

import { waitUntil } from "../../tools/tools";

import { EditorMarketplaceBrowser } from "../../editor/layout/marketplace";

import { projectConfiguration } from "../../project/configuration";

import { IMCPActionOptions } from "../action";

/**
 * Opens the marketplace browser tab in the editor (if not already opened) and returns its reference.
 */
async function openMarketplaceBrowser(options: IMCPActionOptions): Promise<EditorMarketplaceBrowser> {
	const editor = options.editor;

	if (!editor.state.openedTabs.includes("marketplace")) {
		editor.layout.addLayoutTab(<EditorMarketplaceBrowser editor={editor} />, {
			id: "marketplace",
			title: "Marketplace",
			enableClose: true,
			setAsActiveTab: true,
			neighborId: "assets-browser",
		});
	} else {
		editor.layout.selectTab("marketplace");
	}

	await waitUntil(() => !!editor.layout.marketplace);

	return editor.layout.marketplace!;
}

/**
 * Opens the marketplace browser tab in the editor.
 */
export async function openMarketplace(_scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const browser = await openMarketplaceBrowser(options);

	if (data.source) {
		await browser.selectProviderAndSearch(data.source);
	}

	return { opened: true };
}

/**
 * Searches a marketplace, driven through the editor's marketplace browser so it is visible.
 */
export async function searchMarketplace(_scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const browser = await openMarketplaceBrowser(options);

	await browser.selectProviderAndSearch(data.source, data.query);

	const provider = browser.getProviderBySource(data.source);
	const result = await provider!.search(data.query, undefined, undefined);

	return {
		results: result.assets.map((asset) => ({
			id: asset.id,
			name: asset.name,
			source: data.source,
			type: data.type ?? null,
			thumbnailUrl: asset.thumbnailUrl,
		})),
	};
}

/**
 * Triggers a visible download into the project through the editor marketplace browser.
 *
 * TODO: The per-asset quality/type selection normally happens in the marketplace asset inspector UI.
 * Here we pick the first available quality/type from the asset's download options. To make the
 * selection itself visible in the inspector, the marketplace asset inspector would need to expose a
 * public "downloadSelectedAsset" method that the MCP server could drive directly.
 */
export async function downloadMarketplaceAsset(_scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	if (!projectConfiguration.path) {
		throw new Error("No project is currently open.");
	}

	const browser = await openMarketplaceBrowser(options);

	const provider = browser.getProviderBySource(data.source);
	if (!provider) {
		throw new Error(`Unknown marketplace source: ${data.source}`);
	}

	// Fetch details so the download options are available.
	const asset = provider.getAssetDetails ? await provider.getAssetDetails(data.assetId) : null;
	if (!asset) {
		throw new Error(`Could not resolve marketplace asset details for: ${data.assetId}`);
	}

	const downloadOptions = asset.downloadOptions ?? {};
	const qualities = Object.keys(downloadOptions);
	const quality = data.resolution && qualities.includes(data.resolution) ? data.resolution : qualities[0];

	if (!quality) {
		throw new Error(`No downloadable options available for asset: ${data.assetId}`);
	}

	const types = Object.keys(downloadOptions[quality] ?? {});
	const type = types[0];

	// downloadAndImport runs the same path as the UI: shows progress in the console and refreshes the assets browser.
	await provider.downloadAndImport(asset, options.editor, quality, type, type);

	const assetDir = provider.getAssetDir(asset.id, projectConfiguration.path);

	return {
		downloadedPath: relative(dirname(projectConfiguration.path), assetDir),
	};
}
