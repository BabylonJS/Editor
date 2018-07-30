import { Scene, Tools, ParticleSystem, Effect } from 'babylonjs';

import Extensions from '../extensions';
import Extension from '../extension';

import { IStringDictionary } from '../typings/typings';

export interface ParticlesCreatorMetadata {
    id: string;
    apply: boolean;
    code: string;
    compiledCode?: string;
    vertex: string;
    pixel: string;
}

const template = `
EDITOR.ParticlesCreator.Constructors['{{name}}'] = function (scene, particleSystem) {
{{code}}
}
`;

// Set EDITOR on Window
export module EDITOR {
    export class ParticlesCreator {
        public static Constructors = { };
    }
}
window['EDITOR'] = window['EDITOR'] || { };
window['EDITOR'].ParticlesCreator = EDITOR.ParticlesCreator;

export default class ParticlesCreatorExtension extends Extension<ParticlesCreatorMetadata[]> {
    // Public members
    public instances: IStringDictionary<any> = { };

    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    constructor (scene: Scene) {
        super(scene);
        this.datas = [];
    }

    /**
     * On apply the extension
     */
    public onApply (data: ParticlesCreatorMetadata[], rootUrl?: string): void {
        this.datas = data;

        // Add custom code
        data.forEach(d => {
            if (!d.apply)
                return;
            
            const id = d.id + Tools.RandomId();

            // Get particle system
            const ps = <ParticleSystem> this.scene.getParticleSystemByID(d.id);
            if (!ps)
                return;

            // Url
            let url = window.location.href;
            url = url.replace(Tools.GetFilename(url), '') + 'particle-systems/' + d.id.replace(/ /g, '') + '.js';

            // Add script
            Extension.AddScript(template.replace('{{name}}', id).replace('{{code}}', d.compiledCode || d.code), url);

            // Create code
            const ctor = new EDITOR.ParticlesCreator.Constructors[id](this.scene, ps);
            const code = new (ctor.ctor || ctor)();

            // Create effect
            const uniforms: string[] = [];
            const samplers: string[] = [];
            const defines: string[] = [];
            code.setUniforms(uniforms, samplers);
            code.setDefines(defines);

            Effect.ShadersStore[id + 'VertexShader'] = d.vertex;
            Effect.ShadersStore[id + 'PixelShader'] = d.pixel;

            const effect = this.scene.getEngine().createEffectForParticles(id, uniforms, samplers, defines.join('\n'));
            effect.onBind = effect => code.onBind(effect);
            
            ps.customShader = effect;

            // Save instance
            this.instances[d.id] = code;
        });
    }

    /**
     * Called by the editor when serializing the scene
     */
    public onSerialize (): ParticlesCreatorMetadata[] {
        const datas: ParticlesCreatorMetadata[] = [];
        this.scene.particleSystems.forEach(ps => {
            if (ps['metadata'] && ps['metadata'].particlesCreator) {
                ps['metadata'].particlesCreator.id = ps.id;
                datas.push(ps['metadata'].particlesCreator);
            }
        });

        return datas;
    }

    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    public onLoad (data: ParticlesCreatorMetadata[]): void {
        data.forEach(d => {
            const ps = this.scene.getParticleSystemByID(d.id);
            if (!ps)
                return;

            ps['metadata'] = ps['metadata'] || { };
            ps['metadata'].particlesCreator = d;
        });
    }
}

// Register
Extensions.Register('ParticlesCreatorExtension', ParticlesCreatorExtension);
