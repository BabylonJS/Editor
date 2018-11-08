import { Scene } from 'babylonjs';
import Editor, { Layout, ThemeSwitcher, ThemeType } from 'babylonjs-editor';

import CodeGraph from './graph';
import CodeLayout from './code-layout';
import CodeEditorToolbar from './toolbar';

/**
 * Script interface that all editable scripts should follow
 */
export interface Script {
    id: string;
    name: string;
    code: string;
    compiledCode: string;
}

export default class CodeProjectEditor {
    // Public members
    public editor: Editor;
    public scene: Scene;

    public scripts: Script[] = [];

    public layout: Layout = null;

    public graph: CodeGraph = null;
    public codeLayout: CodeLayout = null;
    public toolbar: CodeEditorToolbar;

    /**
     * Constructor
     * @param editor the editor reference
     */
    constructor (editor: Editor) {
        // Misc.
        this.editor = editor;
        this.scene = editor.core.scene;
    }

    /**
     * Creates the code editor
     */
    public async create (): Promise<void> {
        // Create layout
        this.layout = new Layout('EDITOR-DIV');
        this.layout.panels = [
            { type: 'top', size: 30, resizable: false, content: '<div id="TOOLBAR" style="width: 100%; height: 100%;"></div>' },
            { type: 'left', size: 250, resizable: true, content: '<div id="GRAPH" style="width: 100%; height: 100%;"></div>' },
            { type: 'main', content: '<div id="CODE-LAYOUT" style="width: 100%; height: 100%; overflow: hidden;"></div>' }
        ];
        this.layout.build('EDITOR-DIV');

        // Create graph
        this.graph = new CodeGraph(this);
        this.graph.fill();

        // Create resizable code layout
        this.codeLayout = new CodeLayout(this);
        await this.codeLayout.create();
        this.codeLayout.updateTypings();

        // Toolbar
        this.toolbar = new CodeEditorToolbar(this);

        // Apply theme
        const theme = <ThemeType> localStorage.getItem('babylonjs-editor-code-theme-name');
        ThemeSwitcher.ThemeName = theme || 'Light';

        // Resize
        this.resize();

        // Events
        this._bindEvents();
    }

    /**
     * Resizes the code editor
     */
    public resize (): void {
        this.layout.element.resize();
        this.codeLayout.layout.element.updateSize();
    }

    /**
     * Refreshes the code editor
     */
    public refresh (): void {
        this.graph.fill();
    }

    // Binds the needed events
    private _bindEvents (): void {
        // Resize
        window.addEventListener('resize', () => this.resize());

        // Before unload
        window.addEventListener('beforeunload', () => {
            // Save theme
            localStorage.setItem('babylonjs-editor-code-theme-name', ThemeSwitcher.ThemeName);
        });

        // Focus
        window.addEventListener('focus', () => {
            // Get selected
            const selected = this.graph.tree.getSelected();

            // Refill graph
            this.graph.fill();

            // Reset selected
            if (selected)
                this.graph.tree.select(selected.id);

            // Update typings
            this.codeLayout.updateTypings();
        });
    }
}
