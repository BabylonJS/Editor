module BABYLON {
    // Applies an impulse
    export class ApplyImpulseAction extends Action {
        private _target: AbstractMesh;
        private _value: Vector3;

        constructor(triggerOptions: any, target: any, value: Vector3, condition?: Condition) {
            super(triggerOptions, condition);

            this._target = target;
            this._value = value;
        }

        public _prepare(): void {
        }

        public execute(): void {
            if (this._target instanceof AbstractMesh && this._target.getPhysicsImpostor())
                this._target.applyImpulse(this._value, Vector3.Zero());
        }

        public serialize(parent: any): any {
            return super._serialize({
                name: "ApplyImpulseAction",
                properties: [
                    Action._GetTargetProperty(this._target),
                    { name: "value", value: this._value.x + ", " + this._value.y + ", " + this._value.z }
                ]
            }, parent);
        }
    }
}
