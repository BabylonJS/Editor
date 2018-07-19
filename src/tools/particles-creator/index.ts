import { ParticleSystem, Effect, Observer } from 'babylonjs';
import Editor, {
    EditorPlugin,

    Layout,
    CodeEditor,
    Tools,
    Toolbar
} from 'babylonjs-editor';

import '../../extensions/particles-creator/particles-creator';
import { ParticlesCreatorMetadata } from '../../extensions/particles-creator/particles-creator';
import Extensions from '../../extensions/extensions';

export default class ParticlesCreator extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public toolbar: Toolbar = null;

    public functionsCode: CodeEditor = null;
    public pixelCode: CodeEditor = null;
    public vertexCode: CodeEditor = null;

    // Protected members
    protected data: ParticlesCreatorMetadata = null;
    protected currentTab: string = 'PARTICLES-CREATOR-FUNCTIONS';

    protected resizeEvent: Observer<any> = null;
    protected selectedObjectEvent: Observer<any> = null;

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
        this.toolbar.element.destroy();

        this.functionsCode.editor.dispose();
        this.vertexCode.editor.dispose();
        this.pixelCode.editor.dispose();

        this.editor.core.onResize.remove(this.resizeEvent);
        this.editor.core.onSelectObject.remove(this.selectedObjectEvent);

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Template
        !ParticlesCreator.DefaultCode && (ParticlesCreator.DefaultCode = await Tools.LoadFile<string>('./assets/templates/particles-creator/class.ts'));
        !ParticlesCreator.DefaultVertex && (ParticlesCreator.DefaultVertex = await Tools.LoadFile<string>('./assets/templates/particles-creator/shader.vertex.fx'));
        !ParticlesCreator.DefaultPixel && (ParticlesCreator.DefaultPixel = await Tools.LoadFile<string>('./assets/templates/particles-creator/shader.fragment.fx'));
        
        // Layout
        this.layout = new Layout(this.divElement.id);
        this.layout.panels = [
            { type: 'top', size: 32, resizable: false, content: `<div id="PARTICLES-CREATOR-TOOLBAR" style="width: 100%; height: 100%"></div>` },
            {
                type: 'main',
                resizable: false,
                content: `
                    <div id="PARTICLES-CREATOR-FUNCTIONS" style="width: 100%; height: 100%;"></div>
                    <div id="PARTICLES-CREATOR-VERTEX" style="width: 100%; height: 100%; display: none;"></div>
                    <div id="PARTICLES-CREATOR-PIXEL" style="width: 100%; height: 100%; display: none;"></div>
                `,
                tabs: <any>[
                    { id: 'functions', caption: 'Functions' },
                    { id: 'vertex', caption: 'Vertex Shader' },
                    { id: 'pixel', caption: 'Pixel Shader' }
                ]
            }
        ];
        this.layout.build(this.divElement.id);

        // Toolbar
        this.toolbar = new Toolbar('PARTICLES-CREATOR-TOOLBAR');
        this.toolbar.items = [
            { type: 'button', id: 'apply', img: 'icon-play-game-windowed', text: 'Apply' },
            { type: 'break' },
            { type: 'button', img: 'icon-add', text: 'Import From...' }
        ];
        this.toolbar.onClick = id => this.toolbarClicked(id);
        this.toolbar.build('PARTICLES-CREATOR-TOOLBAR');

        // Create editors
        this.functionsCode = new CodeEditor('typescript', '');
        await this.functionsCode.build('PARTICLES-CREATOR-FUNCTIONS');
        this.functionsCode.onChange = value => {
            if (this.data) {
                this.data.code = value;
                this.data.compiledCode = this.functionsCode.transpileTypeScript(value, this.data.id.replace(/ /, ''));
            }
        };

        this.vertexCode = new CodeEditor('cpp', '');
        await this.vertexCode.build('PARTICLES-CREATOR-VERTEX');
        this.vertexCode.onChange = value => this.data && (this.data.vertex = value);

        this.pixelCode = new CodeEditor('cpp', '');
        await this.pixelCode.build('PARTICLES-CREATOR-PIXEL');
        this.pixelCode.onChange = value => this.data && (this.data.pixel = value);
        
        // Events
        this.resizeEvent = this.editor.core.onResize.add(_ => this.resize());
        this.selectedObjectEvent = this.editor.core.onSelectObject.add(obj => this.selectObject(obj));
        
        this.layout.getPanelFromType('main').tabs.on('click', (ev) => {
            $('#' + this.currentTab).hide();
            this.currentTab = 'PARTICLES-CREATOR-' + ev.target.toUpperCase();
            $('#' + this.currentTab).show();
        });

        // Extension
        Extensions.RequestExtension(this.editor.core.scene, 'ParticlesCreatorExtension');

        // Finish
        this.selectObject(this.editor.core.currentSelectedObject);
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

    /**
     * On the user selects an object
     * @param object the selected object
     */
    public selectObject (object: any): void {
        if (!(object instanceof ParticleSystem)) {
            this.data = null;
            this.functionsCode.setValue('');
            this.vertexCode.setValue('');
            this.pixelCode.setValue('');
            this.layout.lockPanel('main', 'No Particle System Selected...');
            return;
        }

        object['metadata'] = object['metadata'] || { };
        this.data = object['metadata'].particlesCreator || {
            id: object.id,
            apply: false,
            code: ParticlesCreator.DefaultCode,
            vertex: ParticlesCreator.DefaultVertex,
            pixel: ParticlesCreator.DefaultPixel
        };
        object['metadata'].particlesCreator = this.data;

        // Unlock and fill
        this.layout.unlockPanel('main');
        this.functionsCode.setValue(this.data.code);
        this.vertexCode.setValue(this.data.vertex);
        this.pixelCode.setValue(this.data.pixel);
    }

    /**
     * On the user clicks on the toolbar
     * @param id the id of the clicked item
     */
    public toolbarClicked (id: string): void {
        if (!this.data)
            return;
        
        switch (id) {
            // Apply
            case 'apply':
                const checked = this.toolbar.isChecked(id, true);
                this.data.apply = checked;
                this.toolbar.setChecked(id, checked);
                break;
            
            default: break;
        }
    }
}
