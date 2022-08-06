import { extname, join } from "path";
import { writeJSON } from "fs-extra";
import filenamify from "filenamify";

import {
    Mesh,
    PointLight, DirectionalLight, SpotLight, HemisphericLight,
    Node, TransformNode,  GroundMesh, ParticleHelper, IParticleSystem,
    Vector3,
    FreeCamera, ArcRotateCamera,
    Texture, VertexData, Color3,
} from "babylonjs";
import { SkyMaterial } from "babylonjs-materials";

import { Alert } from "../gui/alert";
import { Dialog } from "../gui/dialog";

import { Tools } from "../tools/tools";
import { AppTools } from "../tools/app";

import { Editor } from "../editor";

export class SceneFactory {
    /**
     * Adds a new cube to the scene.
     * @param editor the editor reference.
     */
    public static AddCube(editor: Editor): Mesh {
        const cube = Mesh.CreateBox("New Cube", 1, editor.scene!, false);
        cube.metadata = { editorGeometry: { type: "Cube", size: 1 } };
        return this._ConfigureNode(cube);
    }

    /**
     * Adds a new sphere to the scene.
     * @param editor the editor reference.
     */
    public static AddSphere(editor: Editor): Mesh {
        const sphere = Mesh.CreateSphere("New Sphere", 32, 1, editor.scene!, false);
        sphere.metadata = { editorGeometry: { type: "Sphere", segments: 32, diameter: 1, arc: 1, slice: 1 } };
        return this._ConfigureNode(sphere);
    }

    /**
     * Adds a new cylinder to the scene.
     * @param editor the editor reference.
     */
    public static AddCynlinder(editor: Editor): Mesh {
        const cylinder = Mesh.CreateCylinder("New Cylinder", 1, 1, 1, 16, 1, editor.scene!);
        cylinder.metadata = { editorGeometry: { type: "Cylinder", height: 1, diameterTop: 1, diameterBottom: 1, tesselation: 16, subdivisions: 1, arc: 1 } };
        return this._ConfigureNode(cylinder);
    }

    /**
     * Adds a new plane to the scene.
     * @param editor the editor reference.
     */
    public static AddPlane(editor: Editor): Mesh {
        const plane = Mesh.CreatePlane("New Plane", 1, editor.scene!, false);
        plane.rotation.x = Math.PI * 0.5;
        plane.metadata = { editorGeometry: { type: "Plane", width: 1, height: 1 } };
        return this._ConfigureNode(plane);
    }

    /**
     * Adds a new ground to the scene.
     * @param editor the editor reference.
     */
    public static AddGround(editor: Editor): GroundMesh {
        return this._ConfigureNode(Mesh.CreateGround("New Ground", 512, 512, 32, editor.scene!, true) as GroundMesh);
    }

    /**
     * 
     * @param editor the editor reference.
     */
    public static async AddTerrainFromHeightMap(editor: Editor): Promise<Mesh> {
        const ground = this.AddGround(editor);
        const file = await AppTools.ShowOpenFileDialog("Select Height Map Texture");

        const extensions = [".png", ".jpg", ".jpeg", ".bmp"];
        if (extensions.indexOf(extname(file).toLocaleLowerCase()) === -1) {
            const message = `Only [${extensions.join(", ")}] extensions are supported.`;
            Alert.Show("Can't Setup From Height Map", message);
            throw new Error(message);
        }

        const texture = await new Promise<Texture>((resolve, reject) => {
            const texture = new Texture(file, editor.engine!, false, false, Texture.TRILINEAR_SAMPLINGMODE, () => {
                resolve(texture);
            }, (message) => {
                reject(message);
            });
        });

        // Save texture
        ground.metadata = ground.metadata ?? { };
        ground.metadata.heightMap = ground.metadata.heightMap ?? { };
        
        ground.metadata.heightMap.texture = Array.from(new Uint8Array((await texture.readPixels())!.buffer));
        ground.metadata.heightMap.textureWidth = texture.getSize().width;
        ground.metadata.heightMap.textureHeight = texture.getSize().height;
        ground.metadata.heightMap.options = ground.metadata.heightMap.options ?? {
            minHeight: 0,
            maxHeight: 50,
            colorFilter: [0.3, 0.59, 0.11],
        };

        texture.dispose();

        ground.geometry?.setAllVerticesData(VertexData.CreateGroundFromHeightMap({
            width: ground._width,
            height: ground._height,
            subdivisions: ground.subdivisions,
            minHeight: ground.metadata.heightMap.options.minHeight,
            maxHeight: ground.metadata.heightMap.options.maxHeight,
            colorFilter: Color3.FromArray(ground.metadata.heightMap.options.colorFilter),
            buffer: Uint8Array.from(ground.metadata.heightMap.texture),
            bufferWidth: ground.metadata.heightMap.textureWidth,
            bufferHeight: ground.metadata.heightMap.textureHeight,
            alphaFilter: 0
        }), true);

        return ground;
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
     * Adds a new hemispheric light to the scene.
     * @param editor the editor reference.
     */
    public static AddHemisphericLight(editor: Editor): HemisphericLight {
        return this._ConfigureNode(new HemisphericLight("New Hemispheric Light", new Vector3(0, 1, 0), editor.scene!));
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
     * Adds a new sky mesh & material to the scene. The material file will be added
     * to the currently selected assets path.
     * @param editor defines the editor reference.
     */
    public static async AddSky(editor: Editor): Promise<Mesh> {
        const name = await Dialog.Show("Material Name", "Please provide a name for the Sky Material");
        if (!name) {
            throw new Error("Can't create sky material with empty name");
        }

        const jsonName = join(editor.assetsBrowser.state.browsedPath, `${filenamify(name)}.material`);

        const material = new SkyMaterial(name, editor.scene!);
        material.id = Tools.RandomId();
        material.metadata = {
            editorPath: jsonName.replace(join(editor.assetsBrowser.assetsDirectory, "/"), ""),
        };

        const json = material.serialize();
        await writeJSON(jsonName, {
            ...json,
            metadata: material.metadata,
        }, {
            spaces: "\t",
            encoding: "utf-8",
        });

        const skybox = Mesh.CreateBox("Sky", 5000, editor.scene!, false, Mesh.BACKSIDE);
        skybox.material = material;

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
     * Adds a new particle system to the scene.
     * @param editor the editor reference.
     * @param gpu defines wether or not the create system particle should use GPU accelration features.
     */
    public static AddParticleSystem(editor: Editor, gpu: boolean): IParticleSystem {
        const emitter = this._ConfigureNode(new Mesh("New Particle System", editor.scene));

        const ps = ParticleHelper.CreateDefault(emitter, 2000, editor.scene!, gpu);
        ps.start();
        ps.id = Tools.RandomId();

        return ps;
    }

    /**
     * Configures the given node built by the factory.
     */
    private static _ConfigureNode<T extends Node>(node: T): T {
        node.id = Tools.RandomId();
        return node;
    }
}
