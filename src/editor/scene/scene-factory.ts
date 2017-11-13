import {
    Scene,
    Vector3, Color4,
    Texture,
    Mesh, ParticleSystem,
    Tags, Tools as BabylonTools
} from 'babylonjs';

import Editor from '../editor';
import Tools from '../tools/tools';

export default class SceneFactory {
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
    public static CreateDefaultParticleSystem (editor: Editor, emitter?: any): ParticleSystem {
        // Misc
        const scene = editor.core.scene;

        // Emitter
        if (!emitter) {
            emitter = new Mesh('New Particle System Emitter', scene);
            emitter.id = BabylonTools.RandomId();
            Tags.AddTagsTo(emitter, 'added_particlesystem');
        }

        // Create system
        const system = new ParticleSystem('New Particle System', 10000, scene);
        system.id = BabylonTools.RandomId();
        Tools.CreateFileFromURL('assets/textures/flare.png').then(() => {
            system.particleTexture = new Texture('file:flare.png', scene);
            system.particleTexture.name = system.particleTexture.url = 'flare.png';
        });
        system.minAngularSpeed = -0.5;
        system.maxAngularSpeed = 0.5;
        system.minSize = 0.1;
        system.maxSize = 0.5;
        system.minLifeTime = 0.5;
        system.maxLifeTime = 2.0;
        system.minEmitPower = 0.5;
        system.maxEmitPower = 4.0;
        system.emitter = emitter;
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

        this.AddToGraph(editor, system);

        return system;
    }
}
