declare module BABYLON.EDITOR.GUI {
    class GUIForm extends GUIElement implements IGUIForm {
        header: string;
        fields: Array<GUI.IGUIFormField>;
        /**
        * Constructor
        * @param name: the form name
        * @param header: form's header text
        */
        constructor(name: string, header: string, core: EditorCore);
        createField(name: string, type: string, caption: string, span?: number, text?: string, options?: any): IGUIForm;
        setRecord(name: string, value: any): void;
        getRecord(name: string): any;
        buildElement(parent: string): void;
    }
}
