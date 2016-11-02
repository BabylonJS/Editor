declare module BABYLON {
    class StartParticleSystemAction extends Action {
        private _particleSystem;
        constructor(triggerOptions: any, particleSystem: ParticleSystem, condition?: Condition);
        _prepare(): void;
        execute(): void;
        serialize(parent: any): any;
    }
    class StopParticleSystemAction extends Action {
        private _particleSystem;
        constructor(triggerOptions: any, particleSystem: ParticleSystem, condition?: Condition);
        _prepare(): void;
        execute(): void;
        serialize(parent: any): any;
    }
}
