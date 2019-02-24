import * as SocketIO from 'socket.io-client';
import Editor from '../editor';
import CodeEditor from '../gui/code';

export default class VSCodeSocket {
    // Public members
    public static Socket: SocketIOClient.Socket = null;
    public static OnUpdateBehaviorCode: (s: any) => void;

    // Private members
    private static _Editor: Editor = null;

    /**
     * Creates a scene preview listener
     */
    public static async Create (editor: Editor): Promise<void> {
        this._Editor = editor;

        if (this.Socket)
            return;
        
        this.Socket = SocketIO(`http://localhost:1337/vscode`);
        this.Socket.on('update-behavior-code', d => this._UpdateBehaviorCodes(d));
    }

    /**
     * Refreshes the scripts
     * @param scripts the scripts to send (alone or as an array)
     */
    public static Refresh (scripts?: any | any[]): void {
        const metadatas = this._Editor.core.scene.metadata;
        if (!metadatas)
            return;
        
        this.Socket.emit('behavior-codes', scripts || metadatas.behaviorScripts || []);
    }

    // Updates the behavior codes. Will update the found script. Else, will
    // create a new script and add to the scripts collection for behavior editor
    private static async _UpdateBehaviorCodes (d: any): Promise<void> {
        // Get effective script modified in the vscode editor
        const scripts = this._Editor.core.scene.metadata.behaviorScripts;
        const effective = scripts.find(s => s.id === d.id);

        if (!effective) {
            // Created file from editor
            scripts.push({
                name: d.name,
                id: d.id,
                code: d.code,
                compiledCode: await CodeEditor.TranspileTypeScript(d.code, d.name.replace(/ /, ''), {
                    module: 'cjs',
                    target: 'es5',
                    experimentalDecorators: true,
                })
            });
            this._Editor.assets.refresh();
            return;
        }
        else {
            // Just update
            effective.code = d.code;
        }

        // Notify
        this.OnUpdateBehaviorCode(d);
    }
}
