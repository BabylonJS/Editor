import {
    Scene,
    Vector3, Color4,
    Texture,
    Node,
    Mesh, ParticleSystem,
    GroundMesh,
    Tags, Tools as BabylonTools,
    Sound,
    Light, PointLight, DirectionalLight, SpotLight, HemisphericLight,
    EnvironmentHelper,
    FilesInputStore
} from 'babylonjs';
import { AdvancedDynamicTexture, Control, Image } from 'babylonjs-gui';
import { SkyMaterial, WaterMaterial } from 'babylonjs-materials';

import SceneManager from './scene-manager';

import Editor from '../editor';
import Tools from '../tools/tools';

import Window from '../gui/window';
import Picker from '../gui/picker';
import { GraphNode } from '../gui/graph';

export default class SceneFactory {
    /**
     * Adds the given node to the scene's graph (on the right)
     * @param editor the editor reference
     * @param node the node to add
     */
    public static AddToGraph (editor: Editor, node: any): void {
        // Add tags
        Tags.AddTagsTo(node, 'added');

        // Id
        if (!node.id || node.id === node.name)
            node.id = BabylonTools.RandomId();

        // TODO: add dynamically instead of rebuilding graph
        if (node instanceof Control) {
            // TODO: wait for parse and serialize for GUI
            // const texture = editor.core.uiTextures[0];
            // const parent = editor.graph.getByData(texture);

            // if (parent) {
            //     texture.addControl(node);

            //     editor.graph.add(<GraphNode> {
            //         id: node.name,
            //         text: node.name,
            //         img: editor.graph.getIcon(node),
            //         data: node
            //     }, parent.id);
            // }
            editor.graph.clear();
            editor.graph.fill();
        }
        else if (node instanceof Node) {
            editor.graph.add(<GraphNode> {
                id: node.id,
                text: node.name,
                img: editor.graph.getIcon(node),
                data: node
            }, node.parent ? node.parent.id : editor.graph.root);
        }
        else {
            editor.graph.clear();
            editor.graph.fill();
        }

        const selected = editor.graph.getSelected();
        editor.graph.select(selected ? selected.id : editor.graph.root);
        editor.graph.select(node.id);
    }

    /**
     * Creates a new default environment
     * @param editor the editor reference
     */
    public static CreateDefaultEnvironment (editor: Editor): EnvironmentHelper {
        // Remove existing
        if (SceneManager.EnvironmentHelper)
            SceneManager.EnvironmentHelper.dispose();
        
        SceneManager.EnvironmentHelper = editor.core.scene.createDefaultEnvironment({
            // Empty for now
        });

        this.AddToGraph(editor, SceneManager.EnvironmentHelper);

        return SceneManager.EnvironmentHelper;
    }

    /**
     * Creates a new default particle system
     * @param editor: the editor reference
     * @param emitter: the emitter of the system
     */
    public static CreateDefaultParticleSystem (editor: Editor, spriteSheetEnabled: boolean, emitter?: any): ParticleSystem {
        // Misc
        const scene = editor.core.scene;

        // Create system
        const system = new ParticleSystem('New Particle System', 10000, scene, null, spriteSheetEnabled);
        system.id = BabylonTools.RandomId();

        if (!emitter) {
            Tools.GetFile('assets/textures/flare.png').then(async (f) => {
                const b64 = await Tools.ReadFileAsBase64(f);
                system.particleTexture = Texture.CreateFromBase64String(b64, 'flare.png', scene);
                system.particleTexture.name = system.particleTexture.url = 'flare.png';
            });
        }
        system.minAngularSpeed = -0.5;
        system.maxAngularSpeed = 0.5;
        system.minSize = 0.1;
        system.maxSize = 0.5;
        system.minLifeTime = 0.5;
        system.maxLifeTime = 2.0;
        system.minEmitPower = 0.5;
        system.maxEmitPower = 4.0;
        system.emitRate = 400;
        system.blendMode = ParticleSystem.BLENDMODE_ONEONE;
        system.minEmitBox = new Vector3(0, 0, 0);
        system.maxEmitBox = new Vector3(0, 0, 0);
        system.direction1 = new Vector3(-1, 1, -1);
        system.direction2 = new Vector3(1, 1, 1);
        system.color1 = new Color4(1, 0, 0, 1);
        system.color2 = new Color4(0, 1, 1, 1);
        system.gravity = new Vector3(0, -2.0, 0);
        system.start();

        Tags.AddTagsTo(system, 'added');

        // Emitter
        if (emitter) {
            system.emitter = emitter;
            return system;
        }

        const picker = new Picker('Choose Emitter');
        picker.addItems(scene.meshes);
        picker.open(items => {
            let emitter = items.length > 0 ? scene.getNodeByName(items[0].name) : null;
            if (!emitter) {
                emitter = new Mesh('New Particle System Emitter', scene);
                emitter.id = BabylonTools.RandomId();
                Tags.AddTagsTo(emitter, 'added_particlesystem');
            }

            system.emitter = <any> emitter;
            this.AddToGraph(editor, system);
        });

        return system;
    }

    /**
     * Creates a skybox with a sky effect on it (SkyMaterial)
     * @param editor the editor reference
     */
    public static CreateSkyEffect (editor: Editor): Mesh {
        const skybox = Mesh.CreateBox('SkyBox', 5000, editor.core.scene, false, Mesh.BACKSIDE);
        skybox.material = new SkyMaterial('Sky Material ' + BabylonTools.RandomId(), editor.core.scene);

        this.AddToGraph(editor, skybox);

        Tags.AddTagsTo(skybox.material, 'added');

        return skybox;
    }

    /**
     * Creates a new mesh (if createGround set to true) with a water material assigned
     * the water will reflect all the scene's meshes
     * @param editor the editor reference
     */
    public static CreateWaterEffect (editor: Editor, createGround: boolean = true): WaterMaterial {
        const material = new WaterMaterial('New Water Material', editor.core.scene);
        editor.core.scene.meshes.forEach(m => material.addToRenderList(m));

        Tools.GetFile('assets/textures/normal.png').then(async (file) => {
            material.bumpTexture = Texture.CreateFromBase64String(await Tools.ReadFileAsBase64(file), 'normal.png', editor.core.scene);
            material.bumpTexture.name = material.bumpTexture['url'] = 'normal.png';
        });

        if (createGround) {
            const mesh = Mesh.CreateGround('New Water Mesh', 512, 512, 32, editor.core.scene);
            mesh.material = material;

            this.AddToGraph(editor, mesh);
        }

        Tags.AddTagsTo(material, 'added');

        return material;
    }

    /**
     * Creates a new dummy node (transform node)
     * @param editor the editor reference
     */
    public static CreateDummyNode (editor: Editor): Mesh {
        const dummy = new Mesh('New Dummy Node', editor.core.scene);
        dummy.id = BabylonTools.RandomId();
        this.AddToGraph(editor, dummy);

        return dummy;
    }

    /**
     * Creates a new ground mesh
     * @param editor: the editor reference
     */
    public static CreateGroundMesh (editor: Editor): GroundMesh {
        const mesh = <GroundMesh> Mesh.CreateGround('New Ground', 512, 512, 32, editor.core.scene, true);
        this.AddToGraph(editor, mesh);

        return mesh;
    }

    /**
     * Creates a new cube mesh
     * @param editor: the editor reference
     */
    public static CreateCube (editor: Editor): Mesh {
        const mesh = Mesh.CreateBox('New Cube', 5, editor.core.scene);
        this.AddToGraph(editor, mesh);

        return mesh;
    }

    /**
     * Creates a new sphere mesh
     * @param editor: the editor reference
     */
    public static CreateSphere (editor: Editor): Mesh {
        const mesh = Mesh.CreateSphere('New Sphere', 32, 5, editor.core.scene);
        this.AddToGraph(editor, mesh);

        return mesh;
    }

    /**
     * Creates a new light
     * @param editor: the editor reference
     * @param type: the light type
     */
    public static CreateLight (editor: Editor, type: 'point' | 'directional' | 'spot' | 'hemispheric'): Light {
        let light: Light = null;
        
        switch (type) {
            case 'point': light = new PointLight('New Point Light', new Vector3(10, 10, 10), editor.core.scene); break;
            case 'directional': light = new DirectionalLight('New Directional Light', new Vector3(0, -1, 0), editor.core.scene); break;
            case 'spot': light = new SpotLight('New Spot Light', new Vector3(10, 10, 10), new Vector3(-1, -2, -1), Math.PI / 2, Math.PI / 2, editor.core.scene); break;
            case 'hemispheric': light = new HemisphericLight('New Hemispheric Light', new Vector3(0, 1, 0), editor.core.scene); break;
            default: break;   
        }

        this.AddToGraph(editor, light);

        return light;
    }

    /**
     * Adds a new sound
     * @param editor: the editor reference
     */
    public static AddSound (editor: Editor): void {
        Tools.OpenFileDialog(files => {
            const name = files[0].name.toLowerCase();
            const ext = Tools.GetFileExtension(name);

            if (ext !== 'mp3')
                return Window.CreateAlert('Supports only MP3 files', 'Cannot add sound');

            FilesInputStore.FilesToLoad[name] = files[0];

            const sound = new Sound(name, 'file:' + name, editor.core.scene);
            sound['id'] = BabylonTools.RandomId();

            Tags.AddTagsTo(sound, 'added');
            
            this.AddToGraph(editor, sound);
        });
    }

    /**
     * Creates a new GUI advanced texture
     * @param editor: the editor reference
     */
    public static AddGui (editor: Editor): AdvancedDynamicTexture {
        const gui = AdvancedDynamicTexture.CreateFullscreenUI('new ui');
        editor.core.uiTextures.push(gui);

        this.AddToGraph(editor, gui);

        return gui;
    }

    /**
     * Creates a new GUI Image
     * @param editor: the editor reference
     */
    public static AddGuiImage (editor: Editor): Image {
        const img = new Image('New Image');

        this.AddToGraph(editor, img);

        return img;
    }
}
