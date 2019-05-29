import { GUI } from 'dat-gui';

import Edition from '../gui/edition';
import Editor from '../editor';
import { IStringDictionary } from '../typings/typings';

export interface IEditionTool<T> {
    editor?: Editor;

    divId: string;
    tabName: string;

    object: T;
    tool: Edition;
    state: IStringDictionary<ToolState>;

    update (object: T): void;
    clear (): void;
    isSupported (object: any): boolean;
    onModified? (): void;
}

export interface ToolState {
    closed: boolean;
    children: IStringDictionary<ToolState>
}

export default abstract class AbstractEditionTool<T> implements IEditionTool<T> {
    // Public members
    public editor: Editor = null;

    public object: T = null;
    public tool: Edition = null;

    public state: IStringDictionary<ToolState> = null;

    public abstract divId: string;
    public abstract tabName: string;

    /**
     * Constructor
     */
    constructor ()
    { }

    /**
     * Updates the edition tool
     * @param object: the object to edit
     */
    public update (object: T): void {
        this.object = object;

        // Reset edition element
        let lastScroll = 0;

        if (this.tool) {
            lastScroll = this.tool.element.domElement.scrollTop;
            this.state = this._saveState();
            this.tool.remove();
        }

        this.tool = new Edition();
        this.tool.build(this.divId);
        this.tool.element['onResize']();

        setTimeout(() => {
            this.tool.element.domElement.scrollTop = lastScroll;
            this._restoreState();
        }, 0);
    }

    /**
     * Called once the user selects a new object in
     * the scene of the graph
     */
    public clear (): void
    { }

    /**
     * Sets the name of the tool's tab
     * @param name the new name of the tab
     */
    protected setTabName (name: string): void {
        const tab = <any> this.editor.inspector.tabs.get(this.divId);
        tab.caption = name;

        this.editor.inspector.tabs.refresh();
    }

    /**
     * Returns if the object is supported by the edition tool
     * @param object: the object to test
     */
    public abstract isSupported (object: any): boolean;

    // Saves the state of the 
    private _saveState (root: GUI = this.tool.element): IStringDictionary<ToolState> {
        const state = { };

        for (const key in root.__folders) {
            const f = root.__folders[key];
            state[key] = {
                closed: f.closed,
                children: this._saveState(f)
            };
        }

        return state;
    }

    // Restores the state
    private _restoreState (root: GUI = this.tool.element, rootState: IStringDictionary<ToolState> = this.state): void {
        for (const key in rootState) {
            const f = root.__folders[key];
            if (!f)
                continue;

            const value = rootState[key];
            value.closed ? f.close() : f.open();

            this._restoreState(f, value.children);
        }
    }
}
