import * as SocketIO from 'socket.io-client';
import { SceneSerializer, Node, AbstractMesh, Scene } from 'babylonjs';

import Editor from '../editor';

export default class VSCodeSocket {
    // Public members
    public static Socket: SocketIOClient.Socket = null;
    public static OnUpdateBehaviorCode: (s: any) => void;
    public static OnUpdateMaterialCode: (s: any) => void;
    public static OnUpdatePostProcessCode: (s: any) => void;

    public static OnUpdateBehaviorGraph: (g: any) => void;

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

        // Common
        this.Socket.on('refresh', () => this.Refresh());
        this.Socket.on('update-behavior-code', d => this.OnUpdateBehaviorCode && this.OnUpdateBehaviorCode(d));
        this.Socket.on('update-material-code', d => this.OnUpdateMaterialCode && this.OnUpdateMaterialCode(d));
        this.Socket.on('update-post-process-code', d => this.OnUpdatePostProcessCode && this.OnUpdatePostProcessCode(d));
        this.Socket.on('update-behavior-graph', d => this.OnUpdateBehaviorGraph && this.OnUpdateBehaviorGraph(d));

        // Events
        editor.core.onSelectObject.add(o => this.RefreshSelectedObject(o));
        editor.core.onAddObject.add(o => this.RefreshSceneInfos());
        editor.core.onRemoveObject.add(o => this.RefreshSceneInfos());
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
        this.Socket.emit('behavior-graphs', metadatas.behaviorGraphs || []);
        
        this.RefreshSceneInfos();
        this.RefreshSelectedObject(this._Editor.core.currentSelectedObject);
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

    /**
     * Refreshes the given post-processes (single or array)
     * @param data: the post-processes datas to update (single or array)
     */
    public static RefreshPostProcess (data: any | any[]): void {
        this.Socket.emit('post-process-codes', data);
    }

    /**
     * Refreshes the given graphs (single or array)
     * @param data: the graphs datas to update (single or array)
     */
    public static RefreshBehaviorGraph (data: any | any[]): void {
        this.Socket.emit('behavior-graphs', data);
    }

    /**
     * Refreshes the scene infos
     */
    public static RefreshSceneInfos (): void {
        const scene = SceneSerializer.Serialize(this._Editor.core.scene);
        this.Socket.emit('scene-infos', scene);
    }

    /**
     * Refreshes the selected object in the editor
     * @param object the object being selected in the editor
     */
    public static RefreshSelectedObject (object: any): void {
        if (object instanceof Scene) {
            this.Socket.emit('set-selected-object', SceneSerializer.Serialize(object));
            return;
        }

        if (object instanceof AbstractMesh) {
            this.Socket.emit('set-selected-object', SceneSerializer.SerializeMesh(object, false, false).meshes[0]);
            return;
        }

        if (object instanceof Node)
            this.Socket.emit('set-selected-object', object['serialize']());
    }
}
