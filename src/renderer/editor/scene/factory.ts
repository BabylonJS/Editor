import {
    Mesh,
    PointLight, DirectionalLight, SpotLight,
    Node, TransformNode,
    Vector3,
    FreeCamera, ArcRotateCamera,
} from "babylonjs";
import { SkyMaterial } from "babylonjs-materials";

import { Editor } from "../editor";
import { Tools } from "../tools/tools";

export class SceneFactory {
    /**
     * Adds a new cube to the scene.
     * @param editor the editor reference.
     */
    public static AddCube(editor: Editor): Mesh {
        return this._ConfigureNode(Mesh.CreateBox("New Cube", 1, editor.scene!, false));
    }

    /**
     * Adds a new sphere to the scene.
     * @param editor the editor reference.
     */
    public static AddSphere(editor: Editor): Mesh {
        return this._ConfigureNode(Mesh.CreateSphere("New Sphere", 32, 1, editor.scene!, false));
    }

    /**
     * Adds a new point light to the scene.
     * @param editor the editor reference.
     */
    public static AddPointLight(editor: Editor): PointLight {
        return this._ConfigureNode(new PointLight("New Point Light", Vector3.Zero(), editor.scene!));
    }

    /**
     * Adds a new directional light to the scene.
     * @param editor the editor reference.
     */
    public static AddDirectionalLight(editor: Editor): DirectionalLight {
        return this._ConfigureNode(new DirectionalLight("New Directional Light", new Vector3(-1, -2, -1), editor.scene!));
    }

    /**
     * Adds a new spot light to the scene.
     * @param editor the editor reference.
     */
    public static AddSpotLight(editor: Editor): SpotLight {
        return this._ConfigureNode(new SpotLight("New Spot Light", new Vector3(10, 10, 10), new Vector3(-1, -2, -1), Math.PI * 0.5, 1, editor.scene!));
    }

    /**
     * Adds a new free camera to the scene.
     * @param editor the editor reference.
     */
    public static AddFreeCamera(editor: Editor): FreeCamera {
        return this._ConfigureNode(new FreeCamera("New Free Camera", editor.scene!.activeCamera!.position.clone(), editor.scene!, false));
    }

    /**
     * Adds a new arc rotate camera to the scene.
     * @param editor the editor reference.
     */
    public static AddArcRotateCamera(editor: Editor): ArcRotateCamera {
        return this._ConfigureNode(new ArcRotateCamera("New Arc Rotate Camera", 0, 0, 10, Vector3.Zero(), editor.scene!, false));
    }

    /**
     * Adds a new sky to the scene.
     * @param editor the editor reference.
     */
    public static AddSky(editor: Editor): Mesh {
        const skybox = Mesh.CreateBox("Sky", 5000, editor.scene!, false, Mesh.BACKSIDE);
        skybox.material = new SkyMaterial("sky", editor.scene!);
        skybox.material.id = Tools.RandomId();

        return this._ConfigureNode(skybox);
    }

    /**
     * Adds a new dummy node to the scene.
     * @param editor the editor reference.
     */
    public static AddDummy(editor: Editor): TransformNode {
        return this._ConfigureNode(new TransformNode("New Dummy Node", editor.scene!, true));
    }

    /**
     * Configures the given node built by the factory.
     */
    private static _ConfigureNode<T extends Node>(node: T): T {
        node.id = Tools.RandomId();
        return node;
    }
}
