declare class CustomPostProcess extends BABYLON.PostProcess {
    init: () => void;
    setUniforms: (uniforms: string[], samplers: string[]) => void;
    onApply: (effect: BABYLON.Effect) => void;
    dispose: () => void;
}
