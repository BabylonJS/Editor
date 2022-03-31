export interface ISerializedGUIControl {
    /**
     * Defines the metadata of the 
     */
    metadata?: any;
    /**
     * Defines the list of all children of the current control.
     */
    children?: ISerializedGUIControl[];
}

export interface ISerializedGUI {
    /**
     * Defines the reference to the root control of a GUI advanced dynamic texture.
     */
    root: ISerializedGUIControl;
}

export class GUITools {
    /**
     * Cleans the given serialized JSON representation of a GUI advanced dynamic texture.
     * @param data defines the JSON representation of a GUI advanced dynamic texture.
     */
    public static CleanSerializedGUI(data: ISerializedGUI): ISerializedGUI {
        this._RecursivelyCleanSerializedControl(data.root);
        return data;
    }

    /**
     * Recursively cleans the the gicen control and its children.
     */
    private static _RecursivelyCleanSerializedControl(control: ISerializedGUIControl): void {
        delete control.metadata;
        control.children?.forEach((c) => this._RecursivelyCleanSerializedControl(c));
    }
}
