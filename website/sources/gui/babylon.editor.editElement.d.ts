declare module BABYLON.EDITOR.GUI {
    class GUIEditForm extends GUIElement implements IGUIForm {
        header: string;
        fields: Array<GUI.IGUIFormField>;
        /**
        * Constructor
        * @param name: the form name
        * @param header: form's header text
        */
        constructor(name: string, header?: string);
        createField(name: string, type: string, caption: string, span?: number, text?: string, options?: any): IGUIForm;
        setRecord(name: string, value: any): void;
        buildElement(parent: string): void;
    }
}
