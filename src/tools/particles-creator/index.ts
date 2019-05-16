import { Mesh, ParticleSystemSet, Observer, ParticleSystem, Tools as BabylonTools, FilesInputStore } from 'babylonjs';
import Editor, {
    EditorPlugin, Tools,
    Layout, Toolbar, Tree,
    Dialog, UndoRedo,
    Storage
} from 'babylonjs-editor';

import '../../extensions/particles-creator/particles-creator';
import ParticlesCreatorExtension, { ParticlesCreatorMetadata } from '../../extensions/particles-creator/particles-creator';
import Extensions from '../../extensions/extensions';
import Helpers, { Preview } from '../helpers';

import Timeline from './timeline';

export default class ParticlesCreator extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public toolbar: Toolbar = null;
    public tree: Tree = null;
    public tabs: W2UI.W2Tabs = null;

    public undoRedoId: string = 'particles-creator';

    // Protected members
    protected extension: ParticlesCreatorExtension = null;
    protected datas: ParticlesCreatorMetadata[] = [];
    protected data: ParticlesCreatorMetadata = null;

    protected preview: Preview = null;
    protected emitter: Mesh = null;
    protected set: ParticleSystemSet = null;

    protected timeline: Timeline = null;
    protected currentParticleSystem: ParticleSystem = null;
    protected onSelectAssetObserver: Observer<any> = null;

    // Private members
    private _modifyingObjectObserver: Observer<any>;
    private _modifiedObjectObserver: Observer<any>;

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

        this.timeline.dispose();

        this.editor.core.onSelectAsset.remove(this.onSelectAssetObserver);
        this.editor.core.onModifyingObject.remove(this._modifyingObjectObserver);
        this.editor.core.onModifiedObject.remove(this._modifiedObjectObserver);

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
            {
                type: 'left',
                size: '50%',
                resizable: false, 
                content: `
                    <div id="PARTICLES-CREATOR-TREE" style="width: 100%; height: 100%;"></div>
                    <div id="PARTICLES-CREATOR-TIMELINE" style="width: 100%; height: 100%; overflow: hidden;"></div>`,
                tabs: <any> [
                    { id: 'tree', caption: 'List' },
                    { id: 'timeline', caption: 'Timeline' }
                ]
            },
            { type: 'main', size: '50%', resizable: false,  content: `<canvas id="PARTICLES-CREATOR-CANVAS" style="width: 100%; height: 100%; position: absolute; top: 0;"></canvas>` },
        ];
        this.layout.build(this.divElement.id);

        // Tabs
        this.tabs = this.layout.getPanelFromType('left').tabs;
        this.tabs.on('click', (ev) => this.tabChanged(ev.target));
        this.tabs.select('timeline');
        this.tabChanged('timeline');

        // Toolbar
        this.toolbar = new Toolbar('PARTICLES-CREATOR-TOOLBAR');
        this.toolbar.items = [
            { id: 'add', text: 'Add...', caption: 'Add...', img: 'icon-add' },
            { id: 'reset', text: 'Reset', caption: 'Reset', img: 'icon-play-game' },
            { type: 'break' },
            { id: 'export', text: 'Export As...', caption: 'Export As...', img: 'icon-export' },
        ];
        this.toolbar.onClick = id => this.toolbarClicked(id);
        this.toolbar.build('PARTICLES-CREATOR-TOOLBAR');
        this.toolbar.items.forEach(i => this.toolbar.enable(i.id, false));

        // Create tree
        this.tree = new Tree('PARTICLES-CREATOR-TREE');
        this.tree.wholerow = true;
        this.tree.onClick = (<ParticleSystem> (id, data) => {
            this.currentParticleSystem = data;
            this.editor.core.onSelectObject.notifyObservers(data);
        });
        this.tree.onCanDrag = () => false;
        this.tree.onRename = (<ParticleSystem> (id, name, data) => {
            this.currentParticleSystem.name = name;
            this.resetSet(true);
            return true;
        });
        this.tree.onContextMenu = (<ParticleSystem> (id, data) => {
            return [
                { id: 'remove', text: 'Remove', callback: () => this.removeSystemFromSet(data) }
            ];
        });
        this.tree.build('PARTICLES-CREATOR-TREE');

        // Create timeline
        this.timeline = new Timeline(this, <HTMLDivElement> $('#PARTICLES-CREATOR-TIMELINE')[0]);

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
        this._modifyingObjectObserver = this.editor.core.onModifyingObject.add((o: ParticleSystem) => {
            if (!this.data)
                return;
            
            this.timeline.onModifyingSystem(o);
            this.saveSet();
        });
        this._modifiedObjectObserver = this.editor.core.onModifiedObject.add((o: ParticleSystem) => {
            if (!this.data)
                return;

            this.timeline.onModifiedSystem(o);
            this.saveSet();
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
     * Called on the window, layout etc. is resized.
     */
    public onResize (): void {
        this.layout.element.resize();
        this.preview.engine.resize();

        const size = this.layout.getPanelSize('left');
        this.timeline.resize(size.width, size.height);
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
                this.addSystemToSet(ParticlesCreator.DefaultSet.systems[0], name);
                this.resetSet(true);
                break;
            // Reset particle systems set
            case 'reset':
                this.resetSet(true);
                break;

            // Export
            case 'export':
                this.exportSet();
                break;
        }
    }

    /**
     * Called on the user changes tab
     * @param id the id of the new tab
     */
    protected tabChanged (id: string): void {
        // Hide all
        $('#PARTICLES-CREATOR-TREE').hide();
        $('#PARTICLES-CREATOR-TIMELINE').hide();

        // Select which to show
        switch (id) {
            case 'tree': $('#PARTICLES-CREATOR-TREE').show(); break;
            case 'timeline': $('#PARTICLES-CREATOR-TIMELINE').show(); break;
            default: break;
        }
    }

    /**
     * Called on the user selects an asset in the assets panel
     * @param asset the asset being selected
     */
    protected selectAsset (asset: ParticlesCreatorMetadata): void {
        if (!asset || !asset.psData) {
            // Lock toolbar
            this.toolbar.items.forEach(i => this.toolbar.enable(i.id, false));
            return;
        }

        // Unlock toolbar
        this.toolbar.items.forEach(i => this.toolbar.enable(i.id, true));

        // Misc.
        this.data = asset;

        // Set
        if (this.set) {
            this.set.dispose();
            this.set = null;
        }

        this.resetSet(true);

        // Timeline
        this.timeline.setSet(this.set);

        // Undo/Redo
        UndoRedo.ClearScope(this.undoRedoId);
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
    public removeSystemFromSet (ps: ParticleSystem): void {
        // Remove from set
        const index = this.set.systems.indexOf(ps);
        if (index === -1)
            return;

        this.set.systems.splice(index, 1);

        // Finally dispose
        ps.dispose();

        // Remove from tree
        this.tree.remove(ps.id);

        // Reset
        this.resetSet(true);
    }

    /**
     * Resets the particle systems set
     * @param fillTree wehter or not the list tree should be filled.
     */
    public resetSet (fillTree: boolean = false): void {
        if (!this.data)
            return;

        // Const data
        const data = this.set ? this.set.serialize() : this.data.psData;

        // Dispose previous set
        if (this.set)
            this.set.dispose();

        // Clear tree?
        if (fillTree)
            this.tree.clear();

        // Parse set
        this.set = new ParticleSystemSet();
        data.systems.forEach(s => {
            const ps = this.addSystemToSet(s);
            if (fillTree)
                this.tree.add({ id: ps.id, text: ps.name, data: ps, img: 'icon-particles' });
        });

        this.set.start(this.emitter);

        if (this.currentParticleSystem) {
            const ps = this.set.systems.find(ps => ps.name === this.currentParticleSystem.name);
            if (ps) {
                this.tree.select(ps.id);
                this.editor.core.onSelectObject.notifyObservers(ps);
            }
        }

        // Refresh timeline
        this.timeline.setSet(this.set);
    }

    /**
     * Saves the current particle systems set
     */
    public saveSet (): void {
        if (!this.data)
            return;

        const index = this.datas.indexOf(this.data);
        if (index === -1)
            return;

        // Save!
        this.datas[index].psData = this.set.serialize();
    }

    /**
     * Exports the current set
     */
    protected async exportSet (): Promise<void> {
        if (!this.data)
            return;
        
        // Save
        this.saveSet();

        // Export
        const serializationObject = this.set.serialize();

        // Embed?
        const embed = await Dialog.Create('Embed textures?', 'Do you want to embed textures in the set?');
        if (embed === 'Yes') {
            for (const s of serializationObject.systems) {
                const file = FilesInputStore.FilesToLoad[s.textureName.toLowerCase()];
                if (!file)
                    continue;
                s.textureName = await Tools.ReadFileAsBase64(file);
            }
        }

        // Save data
        const json = JSON.stringify(serializationObject, null, '\t');
        const file = Tools.CreateFile(Tools.ConvertStringToUInt8Array(json), this.data.name + '.json');

        // Embeded
        if (embed === 'Yes')
            return BabylonTools.Download(file, file.name);

        // Not embeded
        const textureFiles: File[] = [];
        for (const s of serializationObject.systems) {
            const file = FilesInputStore.FilesToLoad[s.textureName.toLowerCase()];
            if (!file || textureFiles.indexOf(file) !== -1)
                continue;
            textureFiles.push(file);
        }

        const storage = await Storage.GetStorage(this.editor);
        await storage.openPicker('Choose destination folder...', [
            { name: file.name, file: file },
            { name: 'textures', folder: textureFiles.map(tf => ({
                name: tf.name,
                file: tf
            })) }
        ]);
    }
}
