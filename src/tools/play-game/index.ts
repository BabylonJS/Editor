import Editor, { EditorPlugin } from 'babylonjs-editor';

export default class PlayGame extends EditorPlugin {
    // Public members
    public iframe: JQuery<HTMLIFrameElement> = null;
    public contentWindow: Window = null;
    
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

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Create iFrame
        await this.createIFrame();

        // Manage content window
        this.contentWindow = this.iframe[0].contentWindow;

        this.contentWindow.addEventListener('blur', () => this.contentWindow['renderScene'] = false);
        this.contentWindow.addEventListener('focus', () => this.contentWindow['renderScene'] = true);
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
     * Creates the iFrame
     */
    protected async createIFrame (): Promise<void> {
        const div = $(this.divElement);
        div.append('<iframe id="PLAY-GAME-IFRAME" src="./preview.html" sandbox="allow-same-origin allow-scripts allow-pointer-lock" style="width: 100%; height: 100%;"></iframe>');

        this.iframe = <JQuery<HTMLIFrameElement>> $('#PLAY-GAME-IFRAME');

        return new Promise<void>((resolve) => {
            this.iframe[0].onload = () => {
                resolve();
            };
        });
    }
}
