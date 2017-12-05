import {
    Scene,
    Vector3, Color4,
    Texture,
    Mesh, ParticleSystem,
    Tags, Tools as BabylonTools
} from 'babylonjs';

import { SkyMaterial, WaterMaterial } from 'babylonjs-materials';

import Editor from '../editor';
import Tools from '../tools/tools';

import Picker from '../gui/picker';

export default class SceneFactory {
    /**
     * Adds the given node to the scene's graph (on the right)
     * @param editor the editor reference
     * @param node the node to add
     */
    public static AddToGraph (editor: Editor, node: any): void {
        editor.graph.clear();
        editor.graph.fill();
        editor.graph.select(node.id);
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
            Tools.CreateFileFromURL('assets/textures/flare.png').then(() => {
                system.particleTexture = new Texture('file:flare.png', scene);
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

        Tools.CreateFileFromURL('assets/textures/normal.png').then(() => {
            material.bumpTexture = new Texture('file:normal.png', editor.core.scene);
            material.bumpTexture.name = material.bumpTexture['url'] = 'normal.png';
        });

        if (createGround) {
            const mesh = Mesh.CreateGround('New Water Mesh', 512, 512, 32, editor.core.scene);
            mesh.material = material;

            this.AddToGraph(editor, mesh);
        }

        return material;
    }
}
