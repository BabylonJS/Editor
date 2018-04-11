import Editor from '../editor';
import Layout from '../gui/layout';

/**
 * Interface representing an editor plugin
 */
export interface IEditorPlugin {
    divElement: HTMLDivElement;
    name: string;

    create (): Promise<void>;
    close (): Promise<void>;

    onHide? (): Promise<void>;
    onShow? (...params: any[]): Promise<void>;
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
    // Public members
    public editor: Editor;

    public divElement: HTMLDivElement;
    public name: string;

    /**
     * Constructor
     * @param name: the plugin's name
     */
    constructor (name: string) {
        this.name = name;
    }

    /**
     * Creates the plugin
     */
    public abstract async create (): Promise<void>;

    /**
     * Closes the plugin
     */
    public async close (): Promise<void>
    { }

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
}
