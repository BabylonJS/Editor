import { ICommandPaletteType } from "./command-palette";

export type CommandItem = Omit<ICommandPaletteType, "action">;

export const cameraCommandItems = {
	freeCamera: {
		text: "Free Camera",
		label: "Add a new free camera to the scene",
		key: "add-free-camera",
		ipcRendererChannelKey: "free-camera",
	} as CommandItem,
	arcRotateCamera: {
		text: "Arc Rotate Camera",
		label: "Add a new arc-rotate camera to the scene",
		key: "add-arc-rotate-camera",
		ipcRendererChannelKey: "arc-rotate-camera",
	} as CommandItem,
};

export const lightCommandItems = {
	pointLight: {
		text: "Point Light",
		label: "Add a new point light to the scene",
		key: "add-point-light",
		ipcRendererChannelKey: "point-light",
	} as CommandItem,
	directionalLight: {
		text: "Directional Light",
		label: "Add a new directional light to the scene",
		key: "add-directional-light",
		ipcRendererChannelKey: "directional-light",
	} as CommandItem,
	spotLight: {
		text: "Spot Light",
		label: "Add a new spot light to the scene",
		key: "add-spot-light",
		ipcRendererChannelKey: "spot-light",
	} as CommandItem,
	hemisphericLight: {
		text: "Hemispheric Light",
		label: "Add a new hemispheric light to the scene",
		key: "add-hemispheric-light",
		ipcRendererChannelKey: "hemispheric-light",
	} as CommandItem,
};

export const nodeCommandItems = {
	transformNode: {
		text: "Transform Node",
		label: "Add a new transform node to the scene",
		key: "add-transform-node",
		ipcRendererChannelKey: "transform-node",
	} as CommandItem,
};

export const meshCommandItems = {
	box: {
		text: "Box Mesh",
		label: "Add a new box mesh to the scene",
		key: "add-box-mesh",
		ipcRendererChannelKey: "box-mesh",
	} as CommandItem,
	plane: {
		text: "Plane Mesh",
		label: "Add a new plane mesh to the scene",
		key: "add-plane-mesh",
		ipcRendererChannelKey: "plane-mesh",
	} as CommandItem,
	ground: {
		text: "Ground Mesh",
		label: "Add a new ground mesh to the scene",
		key: "add-ground-mesh",
		ipcRendererChannelKey: "ground-mesh",
	} as CommandItem,
	sphere: {
		text: "Sphere Mesh",
		label: "Add a new sphere mesh to the scene",
		key: "add-sphere-mesh",
		ipcRendererChannelKey: "sphere-mesh",
	} as CommandItem,
	capsule: {
		text: "Capsule Mesh",
		label: "Add a new capsule mesh to the scene",
		key: "add-capsule-mesh",
		ipcRendererChannelKey: "capsule-mesh",
	} as CommandItem,
	cylinder: {
		text: "Cylinder Mesh",
		label: "Add a new cylinder mesh to the scene",
		key: "add-cylinder-mesh",
		ipcRendererChannelKey: "cylinder-mesh",
	} as CommandItem,
	torus: {
		text: "Torus Mesh",
		label: "Add a new torus mesh to the scene",
		key: "add-torus-mesh",
		ipcRendererChannelKey: "torus-mesh",
	} as CommandItem,
	torusKnot: {
		text: "Torus Knot Mesh",
		label: "Add a new torus knot mesh to the scene",
		key: "add-torus-knot-mesh",
		ipcRendererChannelKey: "torus-knot-mesh",
	} as CommandItem,
	skybox: {
		text: "Skybox Mesh",
		label: "Add a new skybox mesh to the scene",
		key: "add-skybox-mesh",
		ipcRendererChannelKey: "skybox-mesh",
	} as CommandItem,
	emptyMesh: {
		text: "Empty Mesh",
		label: "Add a new empty mesh to the scene",
		key: "add-empty-mesh",
		ipcRendererChannelKey: "empty-mesh",
	} as CommandItem,
};

export const spriteCommandItems = {
	spriteManager: {
		text: "Sprite Manager",
		label: "Add a new sprite manager to the scene",
		key: "add-sprite-manager",
		ipcRendererChannelKey: "sprite-manager",
	} as CommandItem,
	spriteMap: {
		text: "Sprite Map Node",
		label: "Add a new sprite-map node to the scene",
		key: "add-sprite-map-node",
		ipcRendererChannelKey: "sprite-map-node",
	} as CommandItem,
};
