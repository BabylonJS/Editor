import { Mesh, ParticleSystemSet, Observer, ParticleSystem, Tools as BabylonTools } from 'babylonjs';
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

    protected currentParticleSystem: ParticleSystem = null;

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

        this.preview.scene.dispose();
        this.preview.engine.dispose();

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
            { id: 'add', text: 'Add...', caption: 'Add...', img: 'icon-add' },
            { id: 'reset', text: 'Reset', caption: 'Reset', img: 'icon-play-game' }
        ];
        this.toolbar.onClick = id => this.toolbarClicked(id);
        this.toolbar.build('PARTICLES-CREATOR-TOOLBAR');

        // Create tree
        this.tree = new Tree('PARTICLES-CREATOR-TREE');
        this.tree.onClick = (<ParticleSystem> (id, data) => {
            this.currentParticleSystem = data;
            this.editor.core.onSelectObject.notifyObservers(data);
        });
        this.tree.onCanDrag = () => false;
        this.tree.onRename = (<ParticleSystem> (id, name, data) => {
            this.currentParticleSystem.name = name;
            this.saveSet();
            return true;
        });
        this.tree.onContextMenu = (<ParticleSystem> (id, data) => {
            return [
                { id: 'remove', text: 'Remove', callback: () => this.removeSystemFromSet(data) }
            ];
        });
        this.tree.build('PARTICLES-CREATOR-TREE');

        // Create preview
        this.preview = Helpers.CreatePreview(<HTMLCanvasElement> $('#PARTICLES-CREATOR-CANVAS')[0]);
        this.preview.engine.runRenderLoop(() => this.preview.scene.render());

        this.emitter = new Mesh('emitter', this.preview.scene);

        // Metadatas
        const metadata = Helpers.GetSceneMetadatas(this.editor.core.scene);
        this.datas = metadata.particleSystems = metadata.particleSystems || [];

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
                const name = await Dialog.CreateWithTextInput('Particle System name?');
                const ps = this.addSystemToSet(ParticlesCreator.DefaultSet.systems[0], name);
                this.saveSet();
                this.resetSet(true);
                break;
            // Reset particle systems set
            case 'reset':
                this.resetSet();
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

        // Misc.
        this.data = asset;

        // Set
        this.resetSet(true);
    }

    /**
     * Adds a new particle system to the current set according to the given data
     * @param particleSystemData the particle system data to parse
     */
    protected addSystemToSet (particleSystemData: any, name?: string): ParticleSystem {
        if (!this.set)
            return;

        // Replace id
        particleSystemData.id = BabylonTools.RandomId();

        // Create system
        const rootUrl = particleSystemData.textureName.indexOf('data:') === 0 ? '' : 'file:';

        const ps = ParticleSystem.Parse(particleSystemData, this.preview.scene, rootUrl, false);
        ps.emitter = this.emitter;
        ps.name = name || ps.name;

        // Add to set
        this.set.systems.push(ps);

        return ps;
    }

    /**
     * Removes the given particle system from the current set
     * @param ps the particle system to remove
     */
    protected removeSystemFromSet (ps: ParticleSystem): void {
        // Remove from set
        const index = this.set.systems.indexOf(ps);
        if (index === -1)
            return;

        this.set.systems.splice(index, 1);

        // Finally dispose
        ps.dispose();

        // Remove from tree
        this.tree.remove(ps.id);

        // Save set
        this.saveSet();

        // Reset
        this.resetSet(true);
    }

    /**
     * Resets the particle systems set
     */
    protected resetSet (fillTree: boolean = false): void {
        if (!this.data)
            return;

        // Dispose previous set
        if (this.set)
            this.set.dispose();

        // Clear tree?
        if (fillTree)
            this.tree.clear();

        // Parse set
        this.set = new ParticleSystemSet();
        this.data.psData.systems.forEach(s => {
            const ps = this.addSystemToSet(s);
            if (fillTree)
                this.tree.add({ id: ps.id, text: ps.name, data: ps, img: 'icon-particles' });
        });

        this.set.start(this.emitter);
    }

    /**
     * Saves the current particle systems set
     */
    protected saveSet (): void {
        if (!this.data)
            return;

        const index = this.datas.indexOf(this.data);
        if (index === -1)
            return;

        this.datas[index].psData = this.set.serialize();
    }
}
