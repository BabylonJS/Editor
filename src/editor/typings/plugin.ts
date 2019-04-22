import Editor from '../editor';
import Layout from '../gui/layout';

/**
 * Interface representing an editor plugin
 */
export interface IEditorPlugin {
    /**
     * The div element being available to add custom HTML elements in it
     * By default width 100% and height: 100%
     */
    divElement: HTMLDivElement;
    /**
     * The name of the extension
     */
    name: string;

    /**
     * Called once creating the plugin
     */
    create (): Promise<void>;
    /**
     * Called once closing the plugin
     */
    close (): Promise<void>;

    /**
     * Called on the window, layout etc. is resized.
     */
    onResize? (): Promise<void> | void;
    /**
     * Called on the user hides the extension (by changing tab, etc.)
     */
    onHide? (): Promise<void>;
    /**
     * Called on the user shows the extension (by focising the tab, etc.)
     */
    onShow? (...params: any[]): Promise<void>;

    /**
     * On the editor asks to reload the extension, this function is called before
     * reloading definitely the extension
     */
    onReload? (): Promise<void>;
}

/**
 * Represents an exported editor plugin
 */
export type EditorPluginConstructor = {
    default: new (editor: Editor, ...params: any[]) => IEditorPlugin;
};

/**
 * Abstract class representing an editor plugin
 */
export abstract class EditorPlugin implements IEditorPlugin {
    /**
     * The editor reference
     */
    public editor: Editor;
    /**
     * The div element being available to add custom HTML elements in it
     * By default width 100% and height: 100%
     */
    public divElement: HTMLDivElement;
    /**
     * The name of the extension
     */
    public name: string;

    private _closed: boolean = false;

    /**
     * Constructor
     * @param name: the plugin's name
     */
    constructor (name: string) {
        this.name = name;
    }

    /**
     * Called once closing the plugin
     */
    public abstract async create (): Promise<void>;

    /**
     * Called once closing the plugin
     */
    public async close (): Promise<void> {
        $(this.divElement).html('');
        this._closed = true;
    }

    /**
     * Gets wether or not the plugin has been closed
     */
    public get closed (): boolean {
        return this._closed;
    }

    /**
     * Resizes the current layout giving tabs to draw and hide
     * @param layout the layout to resize
     * @param keep the panels to keep
     * @param hide the panels to hide
     */
    protected resizeLayout (layout: Layout, keep: string[], hide: string[]): void {
        if (!this.editor)
            return;
        
        // Responsive-like landscape / portrait
        const panelSize = this.editor.resizableLayout.getPanelSize(this.name);

        if (panelSize.width > panelSize.height) {
            keep.forEach(k => layout.element.sizeTo(k, panelSize.width / 2));
            hide.forEach(h => layout.element.show(h));
        }
        else {
            keep.forEach(k => layout.element.sizeTo(k, panelSize.width));
            hide.forEach(h => layout.element.hide(h));
        }
    }

    /**
     * On load the extension for the first time
     */
    public static OnLoaded (editor: Editor): void
    { }

    public static _Loaded: boolean = false;
}
