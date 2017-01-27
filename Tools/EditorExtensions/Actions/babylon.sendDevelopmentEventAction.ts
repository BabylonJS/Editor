module BABYLON {
    var defaultData = [
        "{",
        "   eventName: \"myEvent\",",
        "   eventData: {",
        "       ",
        "   }",
        "}"
    ].join("\n");

    // Send a development event
    export class SendDevelopmentEventAction extends Action {
        private _namespace: string;
        private _eventName: string;
        private _data: Object;

        constructor(triggerOptions: any, namespace: string, eventName: string, data: string = defaultData, condition?: Condition) {
            super(triggerOptions, condition);

            this._namespace = namespace;
            this._eventName = eventName;
            this._data = JSON.parse(data);
        }

        public _prepare(): void
        { }

        public execute(): void {
            EDITOR.EXTENSIONS.DevelopmentBaseExtension.SendEvent(this._namespace, { eventName: this._eventName, eventData: this._data });
        }

        public serialize(parent: any): any {
            return super._serialize({
                name: "SendDevelopmentEventAction",
                properties: [
                    { name: "namespace", value: this._namespace },
                    { name: "eventName", value: this._eventName },
                    { name: "data", value: JSON.stringify(this._data) }
                ]
            }, parent);
        }
    }
}
