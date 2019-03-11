import { Engine, Scene, SceneLoader, Tools as BabylonTools } from 'babylonjs';
import { Extensions } from 'babylonjs-editor';
import * as io from 'socket.io-client';

import Tools from '../tool';

declare var vscode: {
    postMessage (message: any): void;
};

export class Preview {
    // public members
    public renderScene: boolean = true;

    public engine: Engine = null;
    public scene: Scene = null;

    /**
     * Constructor
     */
    constructor () {
        // Run sockets
        vscode.postMessage({ command: 'notify', text: 'Connecting to Babylon.JS Editor...' });
        const socket = io('http://' + window['userIp'] + ':1337/client');
        socket.on('request-scene', (files) => {
            vscode.postMessage({ command: 'notify', text: 'Connected to Babylon.JS Editor.' });
        
            // Import Editor tools
            for (var thing in files) {
                var file = Tools.CreateFile(files[thing], thing);
                BABYLON.FilesInputStore.FilesToLoad[thing] = file;
            }
        
            // Get scene file
            var sceneFile = Tools.GetFileByExtension('babylon');
            if (!sceneFile)
                return vscode.postMessage({ command: 'notifyError', text: 'Cannont find any .babylon scene' })
        
            this.loadScene(sceneFile);
        });
    }

    /**
     * Refreshes the page
     */
    public refresh (): void {
        vscode.postMessage({ command: 'refresh' });
    }

    /**
     * Runs the scene
     */
    public runScene (): void {
        this.scene.executeWhenReady(() => {
            this.scene.activeCamera.attachControl(this.engine.getRenderingCanvas());

            this.engine.runRenderLoop(() => {
                if (this.renderScene)
                    this.scene.render();
            });
        });
    }

    /**
     * Loads the scene
     * @param sceneFile the scene file to load
     */
    public async loadScene (sceneFile: File): Promise<void> {
        this.engine = new Engine(<HTMLCanvasElement> document.getElementById('renderCanvas'));

        window.addEventListener("resize", () => this.engine.resize());
        window.addEventListener("blur", () => this.renderScene = false);
        window.addEventListener("focus", () => this.renderScene = true);

        // Import scene
        SceneLoader.Load('file:', sceneFile.name, this.engine, async (scene) => {
            this.scene = scene;

            // Apply extensions
            const project = Tools.GetFileByExtension('editorproject');
            if (!project)
                return this.runScene();

            const data = await Tools.ReadFile<string>(project, false);
            vscode.postMessage({ command: 'notify', text: 'Applying extensions.' });

            Extensions.RoolUrl = 'file:';
            Extensions.ApplyExtensions(scene, JSON.parse(data).customMetadatas);

            this.runScene();
        });
    }
}
