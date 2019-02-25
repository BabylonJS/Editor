import * as SocketIO from 'socket.io-client';
import Editor from '../editor';
import CodeEditor from '../gui/code';

export default class VSCodeSocket {
    // Public members
    public static Socket: SocketIOClient.Socket = null;
    public static OnUpdateBehaviorCode: (s: any) => void;
    public static OnUpdateMaterialCode: (s: any) => void;

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
        this.Socket.on('update-behavior-code', d => this.OnUpdateBehaviorCode && this.OnUpdateBehaviorCode(d));
        this.Socket.on('update-material-code', d => this.OnUpdateMaterialCode && this.OnUpdateMaterialCode(d));
    }

    /**
     * Refreshes the scripts
     * @param scripts the scripts to send (alone or as an array)
     */
    public static Refresh (): void {
        const metadatas = this._Editor.core.scene.metadata;
        if (!metadatas)
            return;
        
        this.Socket.emit('behavior-codes', metadatas.behaviorScripts || []);
        this.Socket.emit('material-codes', metadatas.MaterialCreator || []);
        this.Socket.emit('post-process-codes', metadatas.PostProcessCreator || []);
    }

    /**
     * Refrehses the given behavior (single or array)
     * @param data: the behavior datas to update (single or array)
     */
    public static RefreshBehavior (data: any | any[]): void {
        this.Socket.emit('behavior-codes', data);
    }

    /**
     * Refrehses the given materials (single or array)
     * @param data: the materials datas to update (single or array)
     */
    public static RefreshMaterial (data: any | any[]): void {
        this.Socket.emit('material-codes', data);
    }
}
