import { pathExistsSync } from "fs-extra";
import { dirname, isAbsolute, join } from "path";

export interface ISerializedGUIControl {
    /**
     * Defines the metadata of the 
     */
    metadata?: any;
    /**
     * Defines the name of the class of the control.
     */
    className?: string;

    /**
     * In case of image, defines the source Url of the image file to draw.
     */
    source?: string;

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
    public static CleanSerializedGUI(data: ISerializedGUI, absolutePath: string): ISerializedGUI {
        this._RecursivelyCleanSerializedControl(data.root, absolutePath);
        return data;
    }

    /**
     * Recursively cleans the the gicen control and its children.
     */
    private static _RecursivelyCleanSerializedControl(control: ISerializedGUIControl, absolutePath: string): void {
        delete control.metadata;

        if (control.className === "Image" && control.source) {
            if (isAbsolute(control.source) && pathExistsSync(control.source)) {
                control.source = control.source.replace(join(dirname(absolutePath), "/"), "");
            }
        }

        control.children?.forEach((c) => this._RecursivelyCleanSerializedControl(c, absolutePath));
    }
}
