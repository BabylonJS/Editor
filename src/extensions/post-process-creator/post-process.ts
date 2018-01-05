import { PostProcess, Effect, Scene, SerializationHelper } from 'babylonjs';

/**
 * The custom post-process code interface which
 * comes from the user
 */
export interface CustomPostProcessCode {
    constructor: () => void;
    setUniforms: (uniforms: string[], samplers: string[]) => void;
    onApply: (effect: Effect) => void;
    dispose: () => void;
}

/**
 * Custom post-process config
 */
export interface CustomPostProcessConfig {
    ratio: number;
    textures: string[];
}

export default class PostProcessEditor extends PostProcess {
    // Public members
    public _customCode: CustomPostProcessCode;

    // Protected members
    protected scene: Scene;

    /**
     * Constructor
     * @param name: the name of the post-process 
     * @param fragmentUrl: the url of the fragment shader
     * @param scene: the scene to add in
     * @param ratio: the ratio of the post-process
     * @param customCode: the custom code from user
     */
    constructor(name: string, fragmentUrl: string, scene: Scene, ratio: number, customCode: CustomPostProcessCode) {
        // BABYLON.PostProcess
        super(name, fragmentUrl, [], ['textureSampler'], ratio, scene.activeCamera);

        // Misc.
        this.scene = scene;
        this._customCode = customCode;

        // Constructor
        customCode && customCode.constructor.call(this);

        // Set uniforms
        const uniforms: string[] = ['scale'];
        const samplers: string[] = ['textureSampler'];
        customCode && customCode.setUniforms.call(this, uniforms, samplers);

        this.updateEffect('#define UPDATED\n', uniforms, samplers);

        // On apply
        this.onApply = effect => this._customCode && this._customCode.onApply.call(this, effect);
    }

    /**
     * Disposes the post-process
     */
    public dispose (): void {
        this._customCode && this._customCode.dispose.call(this);
        super.dispose();
    }
}
