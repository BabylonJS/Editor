interface CustomPostProcess {
    init (): void;
    setUniforms (uniforms: string[], samplers: string[]): void;
    onApply (effect: BABYLON.Effect): void;
    dispose (): void;
}
