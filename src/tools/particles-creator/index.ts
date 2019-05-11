import { Mesh, ParticleSystemSet, Observer, ParticleHelper, ParticleSystem } from 'babylonjs';
import Editor, {
    EditorPlugin, Tools,
    Layout, Toolbar, Tree,
    Dialog
} from 'babylonjs-editor';

import '../../extensions/particles-creator/particles-creator';
import ParticlesCreatorExtension, { ParticlesCreatorMetadata } from '../../extensions/particles-creator/particles-creator';
import Extensions from '../../extensions/extensions';
import Helpers, { Preview } from '../helpers';

export default class ParticlesCreator extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public toolbar: Toolbar = null;
    public tree: Tree = null;

    // Protected members
    protected extension: ParticlesCreatorExtension = null;
    protected datas: ParticlesCreatorMetadata[] = [];
    protected data: ParticlesCreatorMetadata = null;

    protected preview: Preview = null;
    protected emitter: Mesh = null;
    protected set: ParticleSystemSet = null;

    protected onSelectAssetObserver: Observer<any> = null;

    // Static members
    public static DefaultSet: any = null;

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor) {
        super('Particle Systems Creator');
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        this.layout.element.destroy();
        this.toolbar.element.destroy();

        this.editor.core.onSelectAsset.remove(this.onSelectAssetObserver);

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Default
        if (!ParticlesCreator.DefaultSet) {
            const set = await Tools.LoadFile<string>('./assets/templates/particles-creator/default-set.json', false);
            ParticlesCreator.DefaultSet = JSON.parse(set);
        }

        // Layout
        this.layout = new Layout(this.divElement.id);
        this.layout.panels = [
            { type: 'top', size: 30, resizable: false, content: `<div id="PARTICLES-CREATOR-TOOLBAR" style="width: 100%; height: 100%"></div>` },
            { type: 'left', size: '50%', resizable: false,  content: `<div id="PARTICLES-CREATOR-TREE" style="width: 100%; height: 100%;"></div>` },
            { type: 'main', size: '50%', resizable: false,  content: `<canvas id="PARTICLES-CREATOR-CANVAS" style="width: 100%; height: 100%;"></canvas>` },
        ];
        this.layout.build(this.divElement.id);

        // Toolbar
        this.toolbar = new Toolbar('PARTICLES-CREATOR-TOOLBAR');
        this.toolbar.items = [
            { id: 'add', text: 'Add...', caption: 'Add...', img: 'icon-add' }
        ];
        this.toolbar.onClick = id => this.toolbarClicked(id);
        this.toolbar.build('PARTICLES-CREATOR-TOOLBAR');

        // Create tree
        this.tree = new Tree('PARTICLES-CREATOR-TREE');
        this.tree.build('PARTICLES-CREATOR-TREE');

        // Create preview
        this.preview = Helpers.CreatePreview(<HTMLCanvasElement> $('#PARTICLES-CREATOR-CANVAS')[0]);
        this.preview.engine.runRenderLoop(() => this.preview.scene.render());

        this.emitter = new Mesh('emitter', this.preview.scene);

        // Metadatas
        const metadata = Helpers.GetSceneMetadatas(this.editor.core.scene);
        this.datas = metadata.particleSystems = metadata.particleSystems || [];
        this.data = this.datas[0];

        // Extension
        this.extension = Extensions.RequestExtension(this.editor.core.scene, 'ParticlesCreatorExtension');
        this.editor.assets.addTab(this.extension);

        // Events
        this.onSelectAssetObserver = this.editor.core.onSelectAsset.add((a) => this.selectAsset(a));
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
     * Called on the window, layout etc. is resized.
     */
    public onResize (): void {
        this.layout.element.resize();
        this.preview.engine.resize();
    }

    /**
     * Called on the user clicks on an item of the toolbar
     * @param id the id of the clicked item
     */
    protected async toolbarClicked (id: string): Promise<void> {
        switch (id) {
            // Add a new particle systems set
            case 'add':
                const name = await Dialog.CreateWithTextInput('Set name');
                this.datas.push({ name: name, psData: Tools.Clone(ParticlesCreator.DefaultSet) });
                this.editor.assets.refresh(this.extension.id);
                this.editor.assets.showTab(this.extension.id);
                break;
        }
    }

    /**
     * Called on the user selects an asset in the assets panel
     * @param asset the asset being selected
     */
    protected async selectAsset (asset: ParticlesCreatorMetadata): Promise<void> {
        if (!asset || !asset.psData)
            return;

        // Dispose previous set
        if (this.set)
            this.set.dispose();

        // Parse set
        this.set = new ParticleSystemSet();
        asset.psData.systems.forEach(ps => {
            const rootUrl = ps.textureName.indexOf('data:') === 0 ? '' : 'file:';
            this.set.systems.push(ParticleSystem.Parse(ps, this.preview.scene, rootUrl, false));
        });

        this.set.start(this.emitter);

        // Fill tree
        this.tree.clear();
        this.set.systems.forEach(s => {
            this.tree.add({ id: s.id, text: s.name, data: s, img: 'icon-particles' });
        });
    }
}
