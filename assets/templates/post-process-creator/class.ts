import { Scene, Effect, Camera } from 'babylonjs';

class PostProcess {
    // Public members
    public time: number = 0;
    public multiplier: number = 1;

    /**
     * Constructor
     */
    constructor (public camera: Camera, public scene: Scene) {

    }

    /**
     * Called on building post-process
     */
    public init (): void {

    }

    /**
     * On set the uniforms and samplers of the shader
     * @param uniforms: the uniforms names in the shader
     * @param samplers: the samplers names in the shader
     */
    public setUniforms (uniforms: string[], samplers: string[]): void {
        // Push custom uniforms
        uniforms.push('time');
    }

    /**
     * On applying the post-process
     * @param effect: the effect which will send the uniforms and samplers to the shader
     */
    public onApply (effect: Effect): void {
        this.time += this.camera.getScene().getEngine().getDeltaTime() * 0.01;
        effect.setFloat('time', this.multiplier * Math.cos(this.time));
    }
    
    /**
     * On dispose the post-process
     */
    public dispose (): void {
    
    }
}

exportScript(PostProcess);
