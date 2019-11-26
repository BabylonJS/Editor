import { Engine, Scene, ArcRotateCamera, Mesh, StandardMaterial, CubeTexture, Color3, Vector3, FilesInputStore } from 'babylonjs';
import Editor, { Window, Layout, Form, Tools, Dialog } from 'babylonjs-editor';

import TextureViewer from './viewer';

export interface Face {
    name: string;
    data: string;
    originalData?: string;
}

export default class AddPureCubeTexture {
    // Public members
    public static Window: Window = null;
    public static Layout: Layout = null;
    public static Form: Form = null;

    public static Engine: Engine = null;
    public static Scene: Scene = null;
    public static Camera: ArcRotateCamera = null;
    public static Skybox: Mesh = null;
    public static Material: StandardMaterial = null;

    public static DefaultFace: string = null;
    public static Faces: Face[] = new Array<Face>(6);

    /**
     * Shows the dialog to configure the pure cube texture being created.
     * @param editor the editor reference
     */
    public static async ShowDialog (editor: Editor, plugin: TextureViewer): Promise<void> {
        // Create window
        this.Window = new Window('AddPureCubeTexture');
        this.Window.body = '<div id="ADD-PURE-CUBE-TEXTURE-LAYOUT" style="width: 100%; height: 100%;"></div>';
        this.Window.width = 1024;
        this.Window.height = 470;
        this.Window.buttons = ['Ok', 'Cancel'];
        await this.Window.open();

        // Create layout
        this.Layout = new Layout('ADD-PURE-CUBE-TEXTURE-LAYOUT');
        this.Layout.panels = [
            { type: 'left', size: '50%', resizable: true, content: '<div id="ADD-PURE-CUBE-TEXTURE-FORM" style="width: 100%; height: 100%;"></div>' },
            { type: 'main', size: '50%', resizable: true, content: '<canvas id="ADD-PURE-CUBE-TEXTURE-CANVAS" style="width: 100%; height: 100%; position: absolute; top: 0"></canvas>' }
        ];
        this.Layout.build('ADD-PURE-CUBE-TEXTURE-LAYOUT');

        // Create form
        this.Form = new Form('ADD-PURE-CUBE-TEXTURE-FORM');
        this.Form.fields = [
            { type: 'file', name: 'Positive X', required: true, options: this._getFileField(0) },
            { type: 'file', name: 'Positive Y', required: true, options: this._getFileField(1) },
            { type: 'file', name: 'Positive Z', required: true, options: this._getFileField(2) },
            { type: 'file', name: 'Negative X', required: true, options: this._getFileField(3) },
            { type: 'file', name: 'Negative Y', required: true, options: this._getFileField(4) },
            { type: 'file', name: 'Negative Z', required: true, options: this._getFileField(5) },
        ]
        this.Form.build('ADD-PURE-CUBE-TEXTURE-FORM');

        // Default faces
        if (!this.DefaultFace) {
            const defaultFile = await Tools.GetFile('assets/textures/waitlogo.png');
            this.DefaultFace = await Tools.ReadFileAsBase64(defaultFile);
        }

        for (let i = 0; i < 6; i++)
            this.Faces[i] = { name: 'default.png', data: this.DefaultFace, originalData: this.DefaultFace.split(',')[1] };

        // Create preview
        this.Engine = new Engine(<HTMLCanvasElement> $('#ADD-PURE-CUBE-TEXTURE-CANVAS')[0]);
        this.Scene = new Scene(this.Engine);
        this.Camera = new ArcRotateCamera('RotateCamera', 0, 0, 10, Vector3.Zero(), this.Scene);
        this.Skybox = Mesh.CreateBox('Skybox', 1000, this.Scene, false, Mesh.BACKSIDE);

        this.Material = new StandardMaterial("mat", this.Scene);
        this.Material.backFaceCulling = true;
        this.Material.diffuseColor = new Color3(0, 0, 0);
        this.Material.specularColor = new Color3(0, 0, 0);
        this.Skybox.material = this.Material;	

        this.Camera.attachControl(this.Engine.getRenderingCanvas(), false);
        this.Engine.runRenderLoop(() => this.Scene.render());

        // Bind events
        this._BindEvents(editor, plugin);

        // Update skybox
        this._UpdateSkybox();
    }

    /**
     * Updates the skybox in the preview canvas
     */
    private static _UpdateSkybox (): void {
        if (this.Material.reflectionTexture)
            this.Material.reflectionTexture.dispose();
        
        this.Material.reflectionTexture = new CubeTexture('', this.Scene, null, false, this.Faces.map(f => f.data));
        this.Material.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    }

    /**
     * Returns the file field according to the given texture index
     * @param index the index in textures to load while creating the cube texture
     */
    private static _getFileField (index: number): any {
        return {
            max: 1,
            style: 'width: 330px',
            readContent: false,
            onRemove: () => {
                this.Faces[index] = { name: 'default.png', data: this.DefaultFace };
                this._UpdateSkybox();
            },
            onAdd: (event) => {
                const data = event.file;
                event.onComplete = () => {
                    const ext = Tools.GetFileExtension(data.name).toLowerCase();
                    if (ext !== 'png' && ext !== 'jpg' && ext !== 'jpeg' && ext !== 'bmp')
                        return;
                    
                    this.Faces[index] = { name: data.name, data: 'data:' + data.type + ';base64,' + data.content, originalData: data.content };
                    this._UpdateSkybox();
                };
            }
        };
    }

    /**
     * Binds all the events
     * @param editor the editor reference
     */
    private static _BindEvents (editor: Editor, plugin: TextureViewer): void {
        // On close
        this.Window.onClose = () => {
            this.Form.element.destroy();
            this.Layout.element.destroy();

            this.Scene.dispose();
            this.Engine.stopRenderLoop();
            this.Engine.dispose();
        };

        // On button click
        this.Window.onButtonClick = async (id) => {
            if (id === 'Cancel')
                return this.Window.close();

            // For each texture, create blobs
            for (const f of this.Faces) {
                if (!f.originalData)
                    continue;
                
                const bytes = atob(f.originalData);
                const file = Tools.CreateFile(Tools.ConvertStringToUInt8Array(bytes), f.name);

                FilesInputStore.FilesToLoad[file.name.toLowerCase()] = file;
            }

            // Create cube texture
            const finalTexture = new CubeTexture('', editor.core.scene, null, false, this.Faces.map(f => 'file:' + f.name), null, null, null, false);
            finalTexture.name = await Dialog.CreateWithTextInput('Texture Name?');

            editor.core.onAddObject.notifyObservers(finalTexture);
            plugin.addPureCubeTexturePreviewNode(finalTexture);

            // Close
            this.Window.close();
        };
    }
}
