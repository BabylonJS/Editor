import { Scene } from 'babylonjs';
import Editor, { EditorPlugin } from 'babylonjs-editor';

export default class PlayGame extends EditorPlugin {
    // Public members
    public iframe: JQuery<HTMLIFrameElement> = null;
    public contentWindow: Window = null;

    // Protected members
    protected onChangeValue = (data: { baseObject?: any; object: any; property: string; value: any; initialValue: any; }) => this.updateValue(data);
    
    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor) {
        super('Game');
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        $(this.divElement).empty();
        this.editor.core.onGlobalPropertyChange.removeCallback(this.onChangeValue);
        
        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Create iFrame
        await this.createIFrame();

        // Events
        this.editor.core.onGlobalPropertyChange.add(this.onChangeValue);
    }

    /**
     * On hide the plugin (do not render scene)
     */
    public async onHide (): Promise<void> {
        this.contentWindow['renderScene'] = false;
    }

    /**
     * On show the plugin (render scene)
     */
    public async onShow (): Promise<void> {
        this.contentWindow['renderScene'] = true;
    }

    /**
     * On reload the plugin
     */
    public async onReload (): Promise<void> {
        $(this.divElement).empty();
        await this.createIFrame();
    }

    /**
     * Creates the iFrame
     */
    protected async createIFrame (): Promise<void> {
        const div = $(this.divElement);
        div.append('<iframe id="PLAY-GAME-IFRAME" src="./preview.html" sandbox="allow-same-origin allow-scripts allow-pointer-lock" style="width: 100%; height: 100%;"></iframe>');

        this.iframe = <JQuery<HTMLIFrameElement>> $('#PLAY-GAME-IFRAME');

        return new Promise<void>((resolve) => {
            this.iframe[0].onload = () => {
                this.contentWindow = this.iframe[0].contentWindow;

                // Manage content window
                this.contentWindow.addEventListener('blur', () => this.contentWindow['renderScene'] = false);
                this.contentWindow.addEventListener('focus', () => this.contentWindow['renderScene'] = true);

                // Resolve
                resolve();
            };
        });
    }

    /**
     * Updates the value in the preview page according to undo/redo
     * @param data the data to undo-redo
     */
    protected updateValue (data: { baseObject?: any; object: any; property: string; value: any; initialValue: any; }): void {
        if (!data.baseObject)
            return;

        // Get property
        let additionalProperty: string = null;

        if (data.baseObject[data.property] === undefined) {
            for (const thing in data.baseObject) {
                if (data.baseObject[thing] !== data.object)
                    continue;
                
                additionalProperty = thing;
                break;
            }

            if (!additionalProperty)
                return;
        }

        const scene = <Scene> this.contentWindow['effectiveScene'];

        const id = data.baseObject.id;
        const obj = 
            scene.getMeshByID(id) ||
            scene.getMaterialByID(id) ||
            scene.getLightByID(id) ||
            scene.getCameraByID(id) ||
            scene.getParticleSystemByID(id) ||
            scene.getSkeletonById(id) ||
            scene.getLensFlareSystemByID(id);

        if (!obj)
            return;

        if (additionalProperty)
            obj[additionalProperty][data.property] = data.value;
        else
            obj[data.property] = data.value;
    }
}
