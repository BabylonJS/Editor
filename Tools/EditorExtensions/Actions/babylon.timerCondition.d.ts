declare module BABYLON {
    class TimerCondition extends Condition {
        _actionManager: ActionManager;
        private _value;
        private _started;
        private _finished;
        constructor(actionManager: ActionManager, value: number);
        isValid(): boolean;
        serialize(): any;
    }
}
