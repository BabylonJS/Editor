declare module BABYLON {
    class DistanceToCameraCondition extends Condition {
        _actionManager: ActionManager;
        private _target;
        private _distance;
        private _operator;
        constructor(actionManager: ActionManager, target: any, distance: number, operator?: number);
        isValid(): boolean;
        serialize(): any;
    }
}
