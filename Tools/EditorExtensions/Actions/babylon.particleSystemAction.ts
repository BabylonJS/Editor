module BABYLON {
    // Start particle system
    export class StartParticleSystemAction extends Action {
        private _particleSystem: ParticleSystem;

        constructor(triggerOptions: any, particleSystem: ParticleSystem, condition?: Condition) {
            super(triggerOptions, condition);
            this._particleSystem = particleSystem;
        }

        public _prepare(): void {
        }

        public execute(): void {
            if (this._particleSystem !== undefined)
                this._particleSystem.start();
        }

        public serialize(parent: any): any {
            return super._serialize({
                name: "StartParticleSystemAction",
                properties: [{ name: "particleSystem", value: this._particleSystem ? this._particleSystem.id : "" }]
            }, parent);
        }
    }

    // Start particle system
    export class StopParticleSystemAction extends Action {
        private _particleSystem: ParticleSystem;

        constructor(triggerOptions: any, particleSystem: ParticleSystem, condition?: Condition) {
            super(triggerOptions, condition);
            this._particleSystem = particleSystem;
        }

        public _prepare(): void {
        }

        public execute(): void {
            if (this._particleSystem !== undefined)
                this._particleSystem.stop();
        }

        public serialize(parent: any): any {
            return super._serialize({
                name: "StopParticleSystemAction",
                properties: [{ name: "particleSystem", value: this._particleSystem ? this._particleSystem.id : "" }]
            }, parent);
        }
    }
}
