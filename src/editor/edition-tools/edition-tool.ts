import Edition from '../gui/edition';
import Editor from '../editor';

export interface IEditionTool<T> {
    editor?: Editor;

    divId: string;
    tabName: string;

    object: T;
    tool: Edition;

    update(object: T): void;
    isSupported(object: any): boolean;
}

export default abstract class AbstractEditionTool<T> implements IEditionTool<T> {
    // Public members
    public editor: Editor = null;

    public object: T = null;
    public tool: Edition = null;

    public abstract divId: string;
    public abstract tabName: string;

    /**
     * Constructor
     */
    constructor() { }

    /**
     * Updates the edition tool
     * @param object: the object to edit
     */
    public update(object: T): void {
        this.object = object;

        // Reset edition element
        if (this.tool) {
            this.tool.remove();
        }

        this.tool = new Edition();
        this.tool.build(this.divId);
    }

    /**
     * Sets the name of the tool's tab
     * @param name the new name of the tab
     */
    protected setTabName(name: string): void {
        const tab = <any> this.editor.edition.panel.tabs.get(this.tabName);
        tab.caption = name;

        this.editor.edition.panel.tabs.refresh();
    }

    /**
     * Returns if the object is supported by the edition tool
     * @param object: the object to test
     */
    public abstract isSupported(object: any): boolean;
}