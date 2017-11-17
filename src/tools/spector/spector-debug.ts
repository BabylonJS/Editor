import { EmbeddedFrontend } from 'spectorjs';

import Editor from '../../editor/editor';
import { EditorPlugin } from '../../editor/typings/plugin';

import Extensions from '../../extensions/extensions';

import SpectorDebugExtension from '../../extensions/debug/spector-debug';
import '../../extensions/debug/spector-debug';

export default class SpectorDebug extends EditorPlugin {
    // Protected members
    protected extension: SpectorDebugExtension = null;

    // Static members

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor) {
        super('SpectorDebug');
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        this.extension.spector.captureMenu.hide();

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        const div = $(this.divElement);

        // Request extension
        this.extension = Extensions.RequestExtension<SpectorDebugExtension>(this.editor.core.scene, 'SpectorDebug');

        // Configure extension
        debugger;
        this.extension.spector.displayUI();
        this.extension.spector.captureMenu.rootPlaceHolder = this.divElement;
        this.extension.spector.captureMenu.resultView = this.divElement;
    }

    /**
     * On the user shows the plugin
     */
    public onShow (): void {

    }
}
