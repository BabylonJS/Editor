declare module BABYLON.EDITOR.GUI {
    class GUIForm extends GUIElement<W2UI.IFormElement> {
        header: string;
        fields: Array<GUI.IGUIFormField>;
        toolbarFields: Array<GUI.IToolbarElement>;
        onFormChanged: () => void;
        onToolbarClicked: (id: string) => void;
        /**
        * Constructor
        * @param name: the form name
        * @param header: form's header text
        */
        constructor(name: string, header: string, core: EditorCore);
        createField(name: string, type: string, caption: string, span?: number, text?: string, options?: any): IGUIForm;
        createToolbarField(id: string, type: string, caption: string, img: string): IToolbarElement;
        setRecord(name: string, value: any): void;
        getRecord(name: string): any;
        buildElement(parent: string): void;
    }
}
