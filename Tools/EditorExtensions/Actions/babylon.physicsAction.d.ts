declare module BABYLON {
    class ApplyImpulseAction extends Action {
        private _target;
        private _value;
        constructor(triggerOptions: any, target: any, value: Vector3, condition?: Condition);
        _prepare(): void;
        execute(): void;
        serialize(parent: any): any;
    }
}
