import { MeshBuilder, Mesh, Node } from "babylonjs";

import { Editor } from "../../editor/main";

import { configureAddedMesh } from "./configure";

export function addBoxMesh(editor: Editor, parent?: Node) {
	const box = MeshBuilder.CreateBox("New Box", { width: 100, height: 100, depth: 100 }, editor.layout.preview.scene);
	box.metadata = {
		type: "Box",
		width: 100,
		depth: 100,
		height: 100,
		sideOrientation: Mesh.FRONTSIDE,
	};

	return configureAddedMesh(editor, box, parent);
}

export function addPlaneMesh(editor: Editor, parent?: Node) {
	const plane = MeshBuilder.CreatePlane("New Plane", { size: 100 }, editor.layout.preview.scene);
	plane.metadata = {
		type: "Plane",
		size: 100,
	};

	return configureAddedMesh(editor, plane, parent);
}

export function addGroundMesh(editor: Editor, parent?: Node) {
	const ground = MeshBuilder.CreateGround("New Ground", { width: 1024, height: 1024, subdivisions: 32 }, editor.layout.preview.scene);
	ground.metadata = {
		type: "Ground",
		width: 1024,
		height: 1024,
		subdivisions: 32,
		heightMapTexturePath: null,
		minHeight: 0,
		maxHeight: 150,
		smoothFactor: 0,
		alphaFilter: 0,
		colorFilter: [1, 1, 1],
	};

	return configureAddedMesh(editor, ground, parent);
}

export function addSphereMesh(editor: Editor, parent?: Node) {
	const sphere = MeshBuilder.CreateSphere("New Sphere", { diameter: 100, segments: 32 }, editor.layout.preview.scene);
	sphere.metadata = {
		type: "Sphere",
		diameter: 100,
		segments: 32,
		sideOrientation: Mesh.FRONTSIDE,
	};

	return configureAddedMesh(editor, sphere, parent);
}

export function addCapsuleMesh(editor: Editor, parent?: Node) {
	const capsule = MeshBuilder.CreateCapsule(
		"New Capsule",
		{ radius: 50, height: 100, subdivisions: 32, topCapSubdivisions: 32, bottomCapSubdivisions: 32 },
		editor.layout.preview.scene
	);
	capsule.metadata = {
		type: "Capsule",
		radius: 50,
		height: 100,
		subdivisions: 32,
		topCapSubdivisions: 32,
		bottomCapSubdivisions: 32,
	};

	return configureAddedMesh(editor, capsule, parent);
}

export function addTorusMesh(editor: Editor, parent?: Node) {
	const torus = MeshBuilder.CreateTorus("New Torus", { diameter: 100, tessellation: 32, thickness: 25 }, editor.layout.preview.scene);
	torus.metadata = {
		type: "Torus",
		diameter: 100,
		thickness: 25,
		tessellation: 32,
	};

	return configureAddedMesh(editor, torus, parent);
}

export function addTorusKnotMesh(editor: Editor, parent?: Node) {
	const torusKnot = MeshBuilder.CreateTorusKnot("New Torus Knot", { radius: 100, tube: 40, radialSegments: 32, tubularSegments: 64 }, editor.layout.preview.scene);
	torusKnot.metadata = {
		type: "TorusKnot",
		radius: 100,
		tube: 40,
		radialSegments: 32,
		tubularSegments: 64,
	};

	return configureAddedMesh(editor, torusKnot, parent);
}

export function addCylinderMesh(editor: Editor, parent?: Node) {
	const cylinder = MeshBuilder.CreateCylinder("New Cylinder", { diameter: 100, height: 100, diameterBottom: 25, diameterTop: 25 }, editor.layout.preview.scene);
	cylinder.metadata = {
		type: "Cylinder",
		height: 100,
		diameterTop: 25,
		diameterBottom: 25,
		subdivisions: 32,
	};

	return configureAddedMesh(editor, cylinder, parent);
}

export function addSkyboxMesh(editor: Editor, parent?: Node) {
	const skybox = MeshBuilder.CreateBox(
		"New SkyBox",
		{
			width: 10_000,
			height: 10_000,
			depth: 10_000,
			sideOrientation: Mesh.BACKSIDE,
		},
		editor.layout.preview.scene
	);
	skybox.infiniteDistance = true;
	skybox.metadata = {
		type: "Box",
		width: 10_000,
		depth: 10_000,
		height: 10_000,
	};

	return configureAddedMesh(editor, skybox, parent);
}

export function addEmptyMesh(editor: Editor, parent?: Node) {
	const emptyMesh = new Mesh("New Empty Mesh", editor.layout.preview.scene);

	return configureAddedMesh(editor, emptyMesh, parent);
}
