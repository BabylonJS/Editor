import { DynamicTexture, Tags } from 'babylonjs';
import * as SocketIO from 'socket.io-client';

import Editor from "../editor";
import { ConsoleLevel } from '../components/console';

import Request from '../tools/request';

export enum PhotoshopExtensionStatus {
    OPENED = 0,
    CLOSED = 1,
    ERROR = 2
}

export default class PhotoshopSocket {
    /**
     * The socket client reference.
     */
    public static Socket: SocketIOClient.Socket = null;
    /**
     * Gets wether or not the photoshop extension is connected.
     */
    public static Connected: boolean = false;

    /**
     * Creates the photoshop socket used to get live texturing.
     * @param editor the editor reference.
     */
    public static async Connect (editor: Editor): Promise<PhotoshopExtensionStatus> {
        if (this.Connected)
            return;
        
        // Process
        const hasProcess = await Request.Get<boolean>('/photoshop/hasProcess');
        if (!hasProcess) {
            const success = await Request.Get<boolean>('/photoshop/createProcess');
            if (!success)
                return PhotoshopExtensionStatus.ERROR;
        }

        // Socket
        this.Socket = SocketIO('http://localhost:1336');
        this.Socket.on("document", (image) => {
            let texture = <DynamicTexture> editor.core.scene.textures.find(t => t.name === image.name && t instanceof DynamicTexture);

            // If exists, check dimensions
            if (texture) {
                const size = texture.getSize();
                if (size.width !== image.width || size.height !== image.height) {
                    texture.dispose();
                    texture = null;
                }
            }

            // Don't exists or removed, create it
            if (!texture) {
                texture = new DynamicTexture(image.name, { width: image.width, height: image.height }, editor.core.scene, false);
                Tags.AddTagsTo(texture, 'photoshop');
                setTimeout(() => editor.core.onAddObject.notifyObservers(texture), 0);
            }

            const ctx = texture.getContext();
            ctx.putImageData(new ImageData(new Uint8ClampedArray(image.pixels), image.width, image.height), 0, 0);
            texture.update(true);

            // Force render scene
            editor.core.renderScenes = true;

            // Notify
            editor.core.onModifiedObject.notifyObservers(texture);
            editor.console.log(`Photoshop: updated texture "${image.name}"`, ConsoleLevel.INFO);
        });

        this.Connected = true;
        return PhotoshopExtensionStatus.OPENED;
    }

    /**
     * Closes the photoshop process.
     */
    public static async Disconnect (): Promise<PhotoshopExtensionStatus> {
        await Request.Get<boolean>('/photoshop/closeProcess');
        this.Socket.close();
        this.Connected = false;
        return PhotoshopExtensionStatus.CLOSED;
    }
}
