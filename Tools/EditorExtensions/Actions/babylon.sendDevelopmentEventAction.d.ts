declare module BABYLON {
    class SendDevelopmentEventAction extends Action {
        private _namespace;
        private _eventName;
        private _data;
        constructor(triggerOptions: any, namespace: string, eventName: string, data?: string, condition?: Condition);
        _prepare(): void;
        execute(): void;
        serialize(parent: any): any;
    }
}
