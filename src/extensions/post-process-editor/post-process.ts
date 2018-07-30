import {
    PostProcess, Effect, Scene, Camera, SerializationHelper,
    BaseTexture, Texture, Engine,
    Tools,
    Vector2, Vector3
} from 'babylonjs';

/**
 * The custom post-process code interface which
 * comes from the user
 */
export interface CustomPostProcessCode {
    init: () => void;
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
    floats: string[];
    vectors2: string[];
    vectors3: string[];
}

export default class AbstractPostProcessEditor extends PostProcess {
    // Public members
    public customCode: CustomPostProcessCode;
    public config: CustomPostProcessConfig;
    public userConfig: { [index: string]: number | Vector2 | Vector3 | BaseTexture } = { };

    // Protected members
    protected scene: Scene;

    protected additionalUniforms: string[] = [];
    protected additionalSamplers: string[] = [];

    /**
     * Constructor
     * @param name: the name of the post-process 
     * @param fragmentUrl: the url of the fragment shader
     * @param camera: the camera to attach to
     * @param ratio: the ratio of the post-process
     * @param customCode: the custom code from user
     */
    constructor(name: string, fragmentUrl: string, camera: Camera, engine: Engine, config: CustomPostProcessConfig, customCode: CustomPostProcessCode) {
        // BABYLON.PostProcess
        super(name, fragmentUrl, [], ['textureSampler'], config.ratio, camera, Texture.BILINEAR_SAMPLINGMODE, engine);

        // Misc.
        this.scene = camera ? camera.getScene() : engine.scenes[0];
        this.customCode = customCode;
        this.config = config;

        // Constructor
        customCode && customCode.init();

        // Set uniforms
        this.setConfig(config);

        // On apply
        this.setOnApply();
    }

    /**
     * Sets the .onApply property of the post-process
     */
    public setOnApply (): void {
        this.onApply = effect => {
            if (this.customCode)
                this.customCode.onApply(effect);

            // Set user config
            this.config.textures.forEach(t => this.userConfig[t] !== undefined && effect.setTexture(t, <BaseTexture> this.userConfig[t]));
            this.config.floats.forEach(f =>   this.userConfig[f] !== undefined && effect.setFloat(f, <number> this.userConfig[f] || 0));
            this.config.vectors2.forEach(v => this.userConfig[v] !== undefined && effect.setVector2(v, <Vector2> this.userConfig[v]));
            this.config.vectors3.forEach(v => this.userConfig[v] !== undefined && effect.setVector3(v, <Vector3> this.userConfig[v]));
        };
    }

    /**
     * Sets the post-process config
     * @param config 
     */
    public setConfig (config: CustomPostProcessConfig): void {
        const uniforms: string[] = ['scale']
            .concat(config.floats)
            .concat(config.vectors2)
            .concat(config.vectors3);
        const samplers: string[] = ['textureSampler'].concat(config.textures);

        this.customCode && this.customCode.setUniforms(uniforms, samplers);

        // Update and apply config
        try {
            this.updateEffect('#define UPDATED' + Tools.RandomId() + '\n', uniforms, samplers);
            this.config = config;
            this.setOnApply();
        } catch (e) { /* Catch silently */ }
    }

    /**
     * Disposes the post-process
     */
    public dispose (): void {
        this.customCode && this.customCode.dispose();
        super.dispose();
    }

    /**
     * Returns the post-process class name
     */
    public getClassName (): string {
        return 'PostProcessEditor';
    }
}
