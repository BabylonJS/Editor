module BABYLON {
    export class DistanceToCameraCondition extends Condition {
        public _actionManager: ActionManager;

        private _target: any;
        private _distance: number;
        private _operator: number;

        constructor(actionManager: ActionManager, target: any, distance: number, operator: number = ValueCondition.IsEqual) {
            // Initialize
            super(actionManager);

            this._target = target;
            this._distance = distance;
            this._operator = operator;
        }

        // Methods
        public isValid(): boolean {
            var scene = this._actionManager.getScene();

            if (scene.activeCamera && this._target && this._target.position) {
                var distance = Vector3.Distance(this._actionManager.getScene().activeCamera.position, this._target.position);

                switch (this._operator) {
                    case ValueCondition.IsGreater: return distance > this._distance;
                    case ValueCondition.IsLesser: return distance < this._distance;
                    case ValueCondition.IsEqual:
                    case ValueCondition.IsDifferent:
                        var check = check = this._distance === distance;
                        return this._operator === ValueCondition.IsEqual ? check : !check;
                }
            }

            return false;
        }
        
        public serialize(): any {
            return this._serialize({
               name: "DistanceToCameraCondition",
               properties: [
                   Action._GetTargetProperty(this._target),
                   { name: "value", value: this._distance }
                ]
            });
        }
    }
}