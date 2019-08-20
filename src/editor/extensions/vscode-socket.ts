import * as SocketIO from 'socket.io-client';
import { SceneSerializer, Node, Scene } from 'babylonjs';

import Editor from '../editor';
import Tools from '../tools/tools';

export default class VSCodeSocket {
    // Public members
    public static Socket: SocketIOClient.Socket = null;
    public static OnUpdateBehaviorCode: (s: any) => void;
    public static OnUpdateMaterialCode: (s: any) => void;
    public static OnUpdatePostProcessCode: (s: any) => void;

    // Private members
    private static _Editor: Editor = null;
    
    private static _TsConfig: string = null;
    private static _BabylonJS: string = null;
    private static _BabylonJSMaterials: string = null;
    private static _BabylonJSPostProcess: string = null;
    private static _Tools: string = null;
    private static _Mobile: string = null;
    private static _PathFinder: string = null;

    /**
     * Creates a scene preview listener
     */
    public static async Create (editor: Editor): Promise<void> {
        this._Editor = editor;

        if (this.Socket)
            return;
        
        this.Socket = SocketIO(`http://localhost:1337/vscode`);
        // this.Socket.on('connect', () => this.RefreshProject());
        this.Socket.on('connection', () => this.RefreshProject());

        // Common
        this.Socket.on('refresh', () => {
            this.RefreshProject();
            this.Refresh();
        });
        this.Socket.on('update-behavior-code', d => this.OnUpdateBehaviorCode && this.OnUpdateBehaviorCode(d));
        this.Socket.on('update-material-code', d => this.OnUpdateMaterialCode && this.OnUpdateMaterialCode(d));
        this.Socket.on('update-post-process-code', d => this.OnUpdatePostProcessCode && this.OnUpdatePostProcessCode(d));
    }

    /**
     * Refreshes the scripts
     * @param scripts the scripts to send (alone or as an array)
     */
    public static Refresh (): void {
        if (!this.Socket)
            return;
        
        const metadatas = this._Editor.core.scene.metadata;
        if (!metadatas)
            return;
        
        this.Socket.emit('behavior-codes', metadatas.behaviorScripts || []);
        this.Socket.emit('material-codes', metadatas.MaterialCreator || []);
        this.Socket.emit('post-process-codes', metadatas.PostProcessCreator || []);
    }

    /**
     * Refreshes the project
     */
    public static async RefreshProject (): Promise<void> {
        this.Socket && this.Socket.emit('project', {
            tsconfig: this._TsConfig || (this._TsConfig = await Tools.LoadFile<string>('assets/templates/vscode/tsconfig.json')),
            babylonjs: this._BabylonJS || (this._BabylonJS = await Tools.LoadFile<string>('assets/typings/babylon.module.d.ts')),
            babylonjs_materials: this._BabylonJSMaterials || (this._BabylonJSMaterials = await Tools.LoadFile<string>('assets/typings/babylonjs.materials.module.d.ts')),
            babylonjs_postProcess: this._BabylonJSPostProcess || (this._BabylonJSPostProcess = await Tools.LoadFile<string>('assets/typings/babylonjs.postProcess.module.d.ts')),
            tools: this._Tools || (this._Tools = await Tools.LoadFile<string>('assets/templates/code/tools.d.ts')),
            mobile: this._Mobile || (this._Mobile = await Tools.LoadFile<string>('assets/templates/code/mobile.d.ts')),
            pathFinder: this._PathFinder || (this._PathFinder = await Tools.LoadFile<string>('assets/templates/code/path-finder.d.ts')),
        });
    }

    /**
     * Refrehses the given behavior (single or array)
     * @param data: the behavior datas to update (single or array)
     */
    public static RefreshBehavior (data: any | any[]): void {
        this.Socket && this.Socket.emit('behavior-codes', data);
    }

    /**
     * Refrehses the given materials (single or array)
     * @param data: the materials datas to update (single or array)
     */
    public static RefreshMaterial (data: any | any[]): void {
        this.Socket && this.Socket.emit('material-codes', data);
    }

    /**
     * Refreshes the given post-processes (single or array)
     * @param data: the post-processes datas to update (single or array)
     */
    public static RefreshPostProcess (data: any | any[]): void {
        this.Socket && this.Socket.emit('post-process-codes', data);
    }
}
