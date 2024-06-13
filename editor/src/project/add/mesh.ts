import { MeshBuilder, Node, Tools, TransformNode } from "babylonjs";

import { UniqueNumber } from "../../tools/tools";

import { Editor } from "../../editor/main";

export function addTransformNode(editor: Editor, parent?: Node) {
    const transformNode = new TransformNode("New Transform Node", editor.layout.preview.scene);
    transformNode.id = Tools.RandomId();
    transformNode.uniqueId = UniqueNumber.Get();
    transformNode.parent = parent ?? null;

    editor.layout.graph.refresh();
    editor.layout.inspector.setEditedObject(transformNode);
    editor.layout.preview.gizmo.setAttachedNode(transformNode);
}

export function addBox(editor: Editor) {
    const box = MeshBuilder.CreateBox("New Box", { width: 100, height: 100, depth: 100 }, editor.layout.preview.scene);
    box.receiveShadows = true;
    box.id = Tools.RandomId();
    box.uniqueId = UniqueNumber.Get();
    box.metadata = {
        type: "Box",
        width: 100,
        depth: 100,
        height: 100,
    };

    if (box.geometry) {
        box.geometry.id = Tools.RandomId();
        box.geometry.uniqueId = UniqueNumber.Get();
    }

    editor.layout.preview.scene.lights.forEach((light) => {
        light.getShadowGenerator()?.getShadowMap()?.renderList?.push(box);
    });

    editor.layout.graph.refresh();
    editor.layout.inspector.setEditedObject(box);
    editor.layout.preview.gizmo.setAttachedNode(box);
}

export function addGroundMesh(editor: Editor) {
    const ground = MeshBuilder.CreateGround("New Ground", { width: 1024, height: 1024 }, editor.layout.preview.scene);
    ground.receiveShadows = true;
    ground.id = Tools.RandomId();
    ground.uniqueId = UniqueNumber.Get();
    ground.metadata = {
        type: "Ground",
        width: 1024,
        height: 1024,
    };

    if (ground.geometry) {
        ground.geometry.id = Tools.RandomId();
        ground.geometry.uniqueId = UniqueNumber.Get();
    }

    editor.layout.graph.refresh();
    editor.layout.inspector.setEditedObject(ground);
    editor.layout.preview.gizmo.setAttachedNode(ground);
}

export function addSphereMesh(editor: Editor) {
    const sphere = MeshBuilder.CreateSphere("New Sphere", { diameter: 100, segments: 32 }, editor.layout.preview.scene);
    sphere.receiveShadows = true;
    sphere.id = Tools.RandomId();
    sphere.uniqueId = UniqueNumber.Get();
    sphere.metadata = {
        type: "Sphere",
        diameter: 100,
        segments: 32,
    };

    if (sphere.geometry) {
        sphere.geometry.id = Tools.RandomId();
        sphere.geometry.uniqueId = UniqueNumber.Get();
    }

    editor.layout.preview.scene.lights.forEach((light) => {
        light.getShadowGenerator()?.getShadowMap()?.renderList?.push(sphere);
    });

    editor.layout.graph.refresh();
    editor.layout.inspector.setEditedObject(sphere);
    editor.layout.preview.gizmo.setAttachedNode(sphere);
}
