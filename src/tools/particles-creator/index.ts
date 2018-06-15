import { ParticleSystem, Effect, Observer } from 'babylonjs';
import Editor, {
    EditorPlugin,

    Layout,
    CodeEditor,
    Tools
} from 'babylonjs-editor';

export default class ParticlesCreator extends EditorPlugin {
    // Public members
    public layout: Layout = null;

    public functionsCode: CodeEditor = null;
    public pixelCode: CodeEditor = null;
    public vertexCode: CodeEditor = null;

    // Protected members
    protected currentTab: string = 'PARTICLES-CREATOR-FUNCTIONS';

    protected resizeEvent: Observer<any> = null;

    // Static members
    public static DefaultCode: string = '';
    public static DefaultVertex: string = '';
    public static DefaultPixel: string = '';

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor) {
        super('Particles Creator');
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        this.layout.element.destroy();
        this.functionsCode.editor.dispose();
        this.vertexCode.editor.dispose();
        this.pixelCode.editor.dispose();

        this.editor.core.onResize.remove(this.resizeEvent);

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Template
        !ParticlesCreator.DefaultCode && (ParticlesCreator.DefaultCode = await Tools.LoadFile<string>('./assets/templates/particles-creator/' + (Tools.IsElectron() ? 'class.ts' : 'class.js')));
        !ParticlesCreator.DefaultVertex && (ParticlesCreator.DefaultVertex = await Tools.LoadFile<string>('./assets/templates/particles-creator/shader.vertex.fx'));
        !ParticlesCreator.DefaultPixel && (ParticlesCreator.DefaultPixel = await Tools.LoadFile<string>('./assets/templates/particles-creator/shader.fragment.fx'));
        
        // Layout
        this.layout = new Layout(this.divElement.id);
        this.layout.panels = [
            { type: 'top', size: 35, resizable: false, content: `<div id="PARTICLES-CREATOR-TOOLBAR" style="width: 100%; height: 100%"></div>` },
            {
                type: 'main',
                resizable: false,
                content: `
                    <div id="PARTICLES-CREATOR-FUNCTIONS" style="width: 100%; height: 100%"></div>
                    <div id="PARTICLES-CREATOR-VERTEX" style="width: 100%; height: 100%"></div>
                    <div id="PARTICLES-CREATOR-PIXEL" style="width: 100%; height: 100%"></div>
                `,
                tabs: <any>[
                    { id: 'functions', caption: 'Functions' },
                    { id: 'vertex', caption: 'Vertex Shader' },
                    { id: 'pixel', caption: 'Pixel Shader' }
                ]
            }
        ];
        this.layout.build(this.divElement.id);

        // Create editors
        this.functionsCode = new CodeEditor(Tools.IsElectron() ? 'typescript' : 'javascript', ParticlesCreator.DefaultCode);
        await this.functionsCode.build('PARTICLES-CREATOR-FUNCTIONS');

        this.vertexCode = new CodeEditor('glsl', ParticlesCreator.DefaultVertex);
        await this.vertexCode.build('PARTICLES-CREATOR-VERTEX');

        this.pixelCode = new CodeEditor('glsl', ParticlesCreator.DefaultPixel);
        await this.pixelCode.build('PARTICLES-CREATOR-PIXEL');

        // Events
        this.resizeEvent = this.editor.core.onResize.add(_ => this.resize());
        
        this.layout.getPanelFromType('main').tabs.on('click', (ev) => {
            $('#' + this.currentTab).hide();
            this.currentTab = 'PARTICLES-CREATOR-' + ev.target.toUpperCase();
            $('#' + this.currentTab).show();
        });
    }

    /**
     * On hide the plugin (do not render scene)
     */
    public async onHide (): Promise<void> {

    }

    /**
     * On show the plugin (render scene)
     */
    public async onShow (): Promise<void> {

    }

    /**
     * On the window is resized
     */
    public resize (): void {
        this.layout.element.resize();
    }
}
