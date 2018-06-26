import { Scene, Observer } from 'babylonjs';
import Editor, { EditorPlugin, Toolbar, Layout } from 'babylonjs-editor';

export default class PlayGame extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public toolbar: Toolbar = null;

    public iframe: JQuery<HTMLIFrameElement> = null;
    public contentWindow: Window = null;

    // Protected members
    protected changeValueObserver: Observer<any> = null;
    protected resizeObserver: Observer<any> = null;
    
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
        this.layout.element.destroy();
        this.toolbar.element.destroy();

        // Callbacks
        this.editor.core.onGlobalPropertyChange.remove(this.changeValueObserver);
        this.editor.core.onResize.remove(this.resizeObserver);
        
        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Create layout
        this.layout = new Layout(this.divElement.id);
        this.layout.panels = [
            { type: 'top', size: 30, resizable: false, content: '<div id="PLAY-GAME-TOOLBAR" style="width: 100%; height: 100%"></div>' },
            { type: 'main', resizable: false, content: '<iframe id="PLAY-GAME-IFRAME" sandbox="allow-same-origin allow-scripts allow-pointer-lock" style="width: 100%; height: 100%;"></iframe>' }
        ];
        this.layout.build(this.divElement.id);

        // Create toolbar
        this.toolbar = new Toolbar('PLAY-GAME-TOOLBAR');
        this.toolbar.items = [
            { type: 'button', id: 'reload', img: 'w2ui-icon-reload', text: 'Reload' }
        ];
        this.toolbar.onClick = id => this.toolbarClicked(id);
        this.toolbar.build('PLAY-GAME-TOOLBAR');

        // Create iFrame
        await this.createIFrame();

        // Events
        this.changeValueObserver = this.editor.core.onGlobalPropertyChange.add(data => this.updateValue(data));
        this.resizeObserver = this.editor.core.onResize.add(() => this.layout.element.resize());
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
        await this.createIFrame();
    }

    /**
     * On the user clicks on the toolbar
     * @param id the id of the clicked item
     */
    protected async toolbarClicked (id: string): Promise<void> {
        switch (id) {
            case 'reload': await this.createIFrame();
            default: break;
        }
    }

    /**
     * Creates the iFrame
     */
    protected async createIFrame (): Promise<void> {
        this.iframe = <JQuery<HTMLIFrameElement>> $('#PLAY-GAME-IFRAME');
        this.iframe[0].src = './preview.html';

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
