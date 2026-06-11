import { Scene, Node, Light, ShadowGenerator, IShadowLight, DirectionalLight, SpotLight, PointLight } from "babylonjs";

import { isLight } from "../../tools/guards/nodes";

import { addPointLight, addDirectionalLight, addSpotLight, addHemisphericLight } from "../../project/add/light";

import { IMCPActionOptions } from "../action";
import { resolveNode, toNodeSummary, toColor3, toVector3 } from "../tools/resolve";

/**
 * Resolves an optional parent node from the given data.
 */
function resolveOptionalParent(scene: Scene, data: any): Node | undefined {
	if (data.parentId || data.parentName) {
		return resolveNode({ scene, nodeId: data.parentId, nodeName: data.parentName });
	}

	return undefined;
}

/**
 * Creates a light in the scene reusing the editor's "add" functions.
 */
export function createLight(scene: Scene, data: any, options: IMCPActionOptions): any {
	const parent = resolveOptionalParent(scene, data);
	const editor = options.editor;

	let light: Light;
	switch (data.type) {
		case "directional":
			light = addDirectionalLight(editor, parent);
			break;
		case "point":
			light = addPointLight(editor, parent);
			break;
		case "spot":
			light = addSpotLight(editor, parent);
			break;
		case "hemispheric":
			light = addHemisphericLight(editor, parent);
			break;
		default:
			throw new Error(`Unknown light type: ${data.type}`);
	}

	if (data.name) {
		light.name = data.name;
	}

	if (data.position !== undefined && (light as any).position) {
		(light as any).position.copyFrom(toVector3(data.position));
	}

	if (data.direction !== undefined && (light as any).direction) {
		(light as any).direction.copyFrom(toVector3(data.direction));
	}

	if (data.color !== undefined) {
		light.diffuse.copyFrom(toColor3(data.color));
	}

	if (data.intensity !== undefined) {
		light.intensity = data.intensity;
	}

	if (data.range !== undefined && (light instanceof PointLight || light instanceof SpotLight)) {
		light.range = data.range;
	}

	if (data.angle !== undefined && light instanceof SpotLight) {
		light.angle = data.angle;
	}

	options.editor.layout.inspector.forceUpdate();

	return toNodeSummary(light);
}

/**
 * Enables/disables a shadow generator on a light and configures it.
 */
export function setLightShadows(scene: Scene, data: any, options: IMCPActionOptions): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	if (!isLight(node)) {
		throw new Error(`Node "${node.name}" is not a light.`);
	}

	const light = node as IShadowLight;

	const existing = light.getShadowGenerator();
	if (existing) {
		existing.dispose();
	}

	if (data.enabled) {
		const mapSize = data.mapSize ?? 1024;
		const generator = new ShadowGenerator(mapSize, light, true);

		if (!(light instanceof PointLight)) {
			generator.usePercentageCloserFiltering = true;
			generator.filteringQuality = ShadowGenerator.QUALITY_HIGH;
		}

		generator.transparencyShadow = true;
		generator.enableSoftTransparentShadow = true;

		if (data.useBlurExponentialShadowMap !== undefined) {
			generator.useBlurExponentialShadowMap = data.useBlurExponentialShadowMap;
		}

		if (data.darkness !== undefined) {
			generator.setDarkness(data.darkness);
		}

		generator.getShadowMap()?.renderList?.push(...scene.meshes);
	}

	options.editor.layout.inspector.setEditedObject(node);
	options.editor.layout.inspector.forceUpdate();

	return toNodeSummary(node);
}

/**
 * Creates the scene's ClusteredLightContainer (or returns the existing one).
 * The container is always present in the editor preview, so this returns its summary.
 */
export function createClusteredLightContainer(_scene: Scene, _data: any, options: IMCPActionOptions): any {
	const container = options.editor.layout.preview.clusteredLightContainer;

	options.editor.layout.graph.refresh().then(() => {
		options.editor.layout.graph.setSelectedNode(container);
	});
	options.editor.layout.inspector.setEditedObject(container);

	return toNodeSummary(container);
}

/**
 * Moves a non-shadow light into the scene's ClusteredLightContainer.
 */
export function addLightToClusteredContainer(scene: Scene, data: any, options: IMCPActionOptions): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	if (!isLight(node)) {
		throw new Error(`Node "${node.name}" is not a light.`);
	}

	const light = node as Light;

	if (light.getShadowGenerator()) {
		throw new Error(`Light "${light.name}" casts shadows and cannot be added to the clustered light container.`);
	}

	if (light instanceof DirectionalLight || light instanceof SpotLight) {
		// These are still supported as clustered lights in Babylon, fall through.
	}

	options.editor.layout.preview.clusteredLightContainer.addLight(light);

	options.editor.layout.graph.refresh().then(() => {
		options.editor.layout.graph.setSelectedNode(light);
	});
	options.editor.layout.inspector.setEditedObject(light);

	return toNodeSummary(light);
}
