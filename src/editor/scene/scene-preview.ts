import * as SocketIO from 'socket.io-client';
import { FilesInputStore } from 'babylonjs';

import Editor from '../editor';

import Tools from '../tools/tools';
import Request from '../tools/request';

import SceneExporter from './scene-exporter';

export default class ScenePreview {
    public static socket: SocketIOClient.Socket = null;

    /**
     * Creates a scene preview listener
     */
    public static async Create (editor: Editor): Promise<void> {
        const address = await Request.Get<string>('/address');
        
        this.socket = SocketIO(`http://${address}:1337/`);
        this.socket.on('request-scene', () => this.CreateFiles(editor));
    }

    /**
     * Creates the files
     */
    public static async CreateFiles (editor: Editor): Promise<void> {
        const datas = { };

        // Data from files to load
        for (const name in FilesInputStore.FilesToLoad) {
            if (Tools.GetFileExtension(name) === 'babylon')
                continue;
            
            const file = FilesInputStore.FilesToLoad[name];
            const data = await Tools.ReadFileAsArrayBuffer(file);
            datas[name] = data;
        }

        // Project files
        SceneExporter.CreateFiles(editor);
        datas[editor.sceneFile.name] = await Tools.ReadFileAsArrayBuffer(editor.sceneFile);
        datas[editor.projectFile.name] = await Tools.ReadFileAsArrayBuffer(editor.projectFile);

        this.socket.emit('receive-scene', datas);
    }
}
