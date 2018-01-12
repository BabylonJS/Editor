import * as SocketIO from 'socket.io-client';
import { FilesInput } from 'babylonjs';

import Tools from '../tools/tools';

export default class ScenePreview {
    public static socket: SocketIOClient.Socket = null;

    /**
     * Creates a scene preview listener
     */
    public static Create (): void {
        this.socket = SocketIO('http://localhost:1338');
        this.socket.on('request-scene', () => this.CreateFiles());
    }

    /**
     * Creates the files
     */
    public static async CreateFiles (): Promise<void> {
        const datas = { };
        
        for (const name in FilesInput.FilesToLoad) {
            const file = FilesInput.FilesToLoad[name];
            const data = await Tools.ReadFileAsArrayBuffer(file);
            datas[name] = data;
        }

        this.socket.emit('receive-scene', datas);
    }
}
