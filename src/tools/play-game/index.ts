import { Scene, Tools as BabylonTools, FilesInputStore } from 'babylonjs';
import Editor, { EditorPlugin, Toolbar, Layout, Tools } from 'babylonjs-editor';

import { CCapture } from 'ccapture.js';

export default class PlayGame extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public toolbar: Toolbar = null;

    public iframe: JQuery<HTMLIFrameElement> = null;
    public emptyGameNode: HTMLHeadElement = null;
    public contentWindow: Window = null;

    public capturer: CCapture = null;
    public isCapturing: boolean = false;
    public captureBlob: Blob = null;
    
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

        // Capturer
        if (this.capturer)
            this.capturer.stop();

        // Files
        this._clearFiles();
        
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
            { type: 'main', resizable: false, content: '<iframe id="PLAY-GAME-IFRAME" sandbox="allow-same-origin allow-scripts allow-pointer-lock" style="width: 100%; height: 100%; position: absolute; top: 0; border: 0px;"></iframe>' },
            { type: 'left', resizable: false, size: 0, content: `<video id="PLAY-GAME-VIDEO" controls></video>` }
        ];
        this.layout.build(this.divElement.id);

        // Create toolbar
        this.toolbar = new Toolbar('PLAY-GAME-TOOLBAR');
        this.toolbar.items = [
            { type: 'button', id: 'reload', img: 'w2ui-icon-reload', text: 'Reload' },
            { type: 'break' },
            { type: 'button', id: 'record', img: 'icon-record', text: 'Record' },
            { type: 'button', id: 'download-record', img: 'icon-export', text: 'Save Record' },
            { type: 'button', id: 'spectorjs', img: 'icon-camera', text: 'Capture Frame...' },
            { type: 'break' },
            { type: 'button', id: 'stop', img: 'icon-stop', text: 'Stop' }
        ];
        this.toolbar.onClick = id => this.toolbarClicked(id);
        this.toolbar.build('PLAY-GAME-TOOLBAR');

        // Create iFrame
        await this.createIFrame();
    }

    /**
     * On hide the plugin (do not render scene)
     */
    public async onHide (): Promise<void> {
        if (!this.capturer)
            this.contentWindow['renderScene'] = false;
    }

    /**
     * On show the plugin (render scene)
     */
    public async onShow (): Promise<void> {
        if (!this.capturer)
            this.contentWindow['renderScene'] = true;
    }

    /**
     * On reload the plugin
     */
    public async onReload (): Promise<void> {
        await this.createIFrame();
    }

    /**
     * Called on the window, layout etc. is resized.
     */
    public onResize (): void {
        this.layout.element.resize();
    }

    /**
     * On the user clicks on the toolbar
     * @param id the id of the clicked item
     */
    protected async toolbarClicked (id: string): Promise<void> {
        switch (id) {
            // Common
            case 'reload':
                await this.createIFrame();
                break;
            
            // Video recorder
            case 'record':
                this.record();
                this.toolbar.updateItem('record', {
                    checked: this.isCapturing,
                    img: this.isCapturing ? 'icon-error' : 'icon-record'
                });
                break;
            case 'download-record':
                BabylonTools.Download(this.captureBlob, 'capture.webm');
                break;

            // Spectorjs
            case 'spectorjs':
                // Lock
                this.layout.lockPanel('main', 'Capturing...', true);

                // Capture
                setTimeout(() => {
                    this.iframe[0].contentWindow['captureSpector']((capture, logger) => {
                        // Create popup
                        const popup = Tools.OpenPopup('./spectorjs.html', 'SpectorJS', 1280, 800);
                        popup.addEventListener('load', () => {
                            popup['displayView'](capture, logger);
                        });

                        // Unlock
                        this.layout.unlockPanel('main');
                    });

                    // Re-focus to activate spector capture
                    this.iframe.focus();
                }, 500);
                break;

            // Stop
            case 'stop':
                this.iframe[0].src = 'blank';
                this._clearFiles();

                this.emptyGameNode = Tools.CreateElement<HTMLHeadElement>('h1', BabylonTools.RandomId(), {
                    'float': 'left',
                    'left': '50%',
                    'top': '50%',
                    'transform': 'translate(-50%, -50%)',
                    'overflow': 'hidden',
                    'position': 'relative',
                    'font-family': 'Roboto,sans-serif !important',
                    'opacity': '0.5'
                });
                this.emptyGameNode.textContent = 'Test has been stopped.';
                $('#PLAY-GAME-IFRAME').parent().append(this.emptyGameNode);
                this.toolbar.enable('stop', false);
            default: break;
        }
    }

    /**
     * Creates the iFrame
     */
    protected async createIFrame (): Promise<void> {
        // Misc.
        this.capturer = null;

        // Empty game node
        if (this.emptyGameNode) {
            this.emptyGameNode.remove();
            this.emptyGameNode = null;
        }

        this.toolbar.enable('stop', true);

        // Setup layout panels
        this.layout.setPanelSize('left', 0);
        this.layout.hidePanel('left');

        this.layout.setPanelSize('main', this.layout.getPanelSize('top').width);
        this.layout.showPanel('main');

        // Setup toolbar
        this.toolbar.updateItem('download-record', {
            hidden: true
        });

        // Iframe
        this.iframe = <JQuery<HTMLIFrameElement>> $('#PLAY-GAME-IFRAME');
        this.iframe[0].src = './preview.html';

        return new Promise<void>((resolve) => {
            this.iframe[0].onload = () => {
                this.contentWindow = this.iframe[0].contentWindow;

                // Manage content window
                this.contentWindow.addEventListener('blur', () => !(this.capturer) && (this.contentWindow['renderScene'] = false));
                this.contentWindow.addEventListener('focus', () => !(this.capturer) && (this.contentWindow['renderScene'] = true));

                // Resolve
                resolve();
            };
        });
    }

    /**
     * Record the game
     */
    protected async record (): Promise<void> {
        this.isCapturing = !this.isCapturing;

        // Stop capture
        if (!this.isCapturing) {
            this.capturer.stop();
            this.toolbar.notifyMessage('');

            // Layout
            this.layout.showPanel('left');
            this.layout.setPanelSize('left', this.layout.getPanelSize('top').width);

            this.layout.setPanelSize('main', 0);
            this.layout.hidePanel('main');

            // Toolbar
            this.toolbar.updateItem('download-record', {
                hidden: false
            })

            // Set video
            const video = <JQuery<HTMLVideoElement>> $('#PLAY-GAME-VIDEO');
            video[0].src = this.capturer.save(blob => {
                this.captureBlob = blob;
                video[0].src = URL.createObjectURL(blob);
            });

            return;
        }

        // Capture
        await this.createIFrame();
        this.capturer = this.contentWindow['capturer'];

        // Scene
        this.contentWindow['gotScene'] = (scene: Scene) => {
            const engine = scene.getEngine();
            this.contentWindow.requestAnimationFrame(engine._renderLoop.bind(engine));

            // Capture
            const start = Date.now();
            scene.onAfterRenderObservable.add(() => {
                this.capturer.capture(scene.getEngine().getRenderingCanvas());
            });

            // Start capture
            this.capturer.start();
            this.toolbar.notifyMessage(`<h2>Recording...</h2>`);
        };
    }

    /**
     * Shows the previously recorded video
     */
    protected showVideo (): void {

    }

    // Clears all the files
    private _clearFiles (): void {
        if (this.editor.projectFile) {
            delete FilesInputStore.FilesToLoad[this.editor.projectFile.name];
            this.editor.projectFile = null;
        }
        if (this.editor.sceneFile) {
            delete FilesInputStore.FilesToLoad[this.editor.sceneFile.name];
            this.editor.sceneFile = null;
        }

        Tools.GarbageCollect();
    }
}
