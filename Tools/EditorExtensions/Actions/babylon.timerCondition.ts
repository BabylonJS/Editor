module BABYLON {
    export class TimerCondition extends Condition {
        public _actionManager: ActionManager;

        private _value: number;
        private _started: boolean = false;
        private _finished: boolean = false;

        constructor(actionManager: ActionManager, value: number) {
            // Initialize
            super(actionManager);

            this._value = value;
        }

        // Methods
        public isValid(): boolean {
            if (!this._started) {
                this._started = true;
                setTimeout(() => this._finished = true, this._value);
            }

            var returnValue = this._finished;

            if (this._finished) {
                // Reset condition
                this._finished = false;
                this._started = false;
            }

            return returnValue;
        }
        
        public serialize(): any {
            return this._serialize({
               name: "TimerCondition",
               properties: [
                   { name: "value", value: this._value }
                ]
            });
        }
    }
}