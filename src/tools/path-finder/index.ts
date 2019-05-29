import { AbstractMesh, Mesh, Tags, Tools as BabylonTools } from 'babylonjs';
import Editor, {
    Layout,
    Edition,
    Grid, GridRow,
    Picker,
    Toolbar,

    EditorPlugin
} from 'babylonjs-editor';

import Extensions from '../../extensions/extensions';

import { PathFinderMetadata } from '../../extensions/path-finder/index';
import '../../extensions/path-finder/index';

import PathFinder from '../../extensions/path-finder/path-finder';

import PathFinderTool from './path-finder-tool';

export interface PathFinderGrid extends GridRow {
    name: string;
}

export default class PathFinderEditor extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public toolbar: Toolbar = null;
    public grid: Grid<PathFinderGrid> = null;

    public datas: PathFinderMetadata[] = [];
    public data: PathFinderMetadata = null;

    // Protected members
    protected canvas: HTMLCanvasElement = null;
    protected pathCubes: AbstractMesh[] = [];

    /**
     * On load the extension for the first time
     */
    public static OnLoaded (editor: Editor): void {
        editor.inspector.addTool(new PathFinderTool());
    }

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor) {
        super('Path Finder');
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        this.grid.element.destroy();
        this.toolbar.element.destroy();
        this.layout.element.destroy();

        // Scene
        this.pathCubes.forEach(c => c.dispose());

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        const scene = this.editor.core.scene;

        // Get data
        scene.metadata = scene.metadata || { };
        scene.metadata['PathFinderExtension'] = scene.metadata['PathFinderExtension'] || [];

        this.datas = scene.metadata['PathFinderExtension'];
        if (this.datas.length === 0) {
            this.datas.push({
                name: 'New path finder configuration',
                rayHeight: 10,
                size: 100,
                castMeshes: [],
                rayLength: 100
            });
        }
        this.data = this.datas[0];

        // Create layout
        this.layout = new Layout('PathFinder');
        this.layout.panels = [
            { type: 'top', content: '<div id="PATH-FINDER-TOOLBAR" style="width: 100%; height: 100%;"></div>', size: 30, resizable: false },
            { type: 'left', content: '<div id="PATH-FINDER-MESHES" style="width: 100%; height: 100%;"></div>', size: '50%', resizable: true },
            { type: 'main', content: '<canvas id="PATH-FINDER-PREVIEW" style="width: 100%; height: 100%; position: absolute; top: 0;"></canvas>', resizable: true, size: '50%' }
        ];
        this.layout.build(this.divElement.id);

        // Toolbar
        this.toolbar = new Toolbar('PATH-FINDER-TOOLBAR');
        this.toolbar.items = [
            { id: 'paths', type: 'menu', text: 'Paths', img: 'icon-graph', items: [] },
            { id: 'edit', type: 'button', text: 'Edit', img: 'icon-edit' }
        ];
        this.toolbar.onClick = id => this.onToolbarClicked(id);
        this.toolbar.helpUrl = 'http://doc.babylonjs.com/resources/using_pathfinder';
        this.toolbar.build('PATH-FINDER-TOOLBAR');
        this.resetPathsOfToolbar();

        // Add grid
        this.grid = new Grid<PathFinderGrid>('PathFinderGrid', {
            toolbarSearch: false,
            toolbarAdd: true,
            toolbarDelete: true,
            toolbarEdit: false,
            header: 'Mesh Surfaces'
        });
        this.grid.onAdd = () => this.onAdd();
        this.grid.onDelete = (id) => this.onDelete(id);
        this.grid.columns = [{ field: 'name', caption: 'Name', size: '100%' }];
        this.grid.build('PATH-FINDER-MESHES');

        this.data.castMeshes.forEach((cm, index) => this.grid.addRecord({ recid: index, name: cm }));
        this.grid.element.refresh();

        // Get canvas
        this.canvas = <HTMLCanvasElement> $('#PATH-FINDER-PREVIEW')[0];
        this.canvas.addEventListener('click', () => this.editor.inspector.setObject(this));

        // Request extension
        Extensions.RequestExtension(this.editor.core.scene, 'PathFinderExtension');

        // Build
        if (this.data.castMeshes.length > 0)
            this.buildPathFinder();
    }

    /**
     * On the user shows the plugin
     */
    public onShow (): void {
        this.pathCubes.forEach(c => c.isVisible = true);
    }

    /**
     * On the user hides the plugin
     */
    public onHide (): void {
        this.pathCubes.forEach(c => c.isVisible = false);
    }

    /**
     * Called on the window, layout etc. is resized.
     */
    public onResize (): void {
        this.layout.element.resize();
    }

    /**
     * Resets the paths from the toolbar
     */
    public resetPathsOfToolbar (): void {
        const paths = this.toolbar.element.items[0];
        paths.items = this.datas.map(d => ({ id: 'path-' + d.name.toLowerCase(), type: 'button', text: d.name }));

        this.toolbar.element.refresh();
    }

    /**
     * Add a new path-finder configuration
     */
    public addConfiguration (): void {
        const name = 'New path finder configuration';
        const existing = this.datas.find(p => p.name === name);

        this.data = {
            name: name + (existing ? '_' + BabylonTools.RandomId() : ''),
            rayHeight: 10,
            size: 100,
            castMeshes: [],
            rayLength: 100
        };

        this.datas.push(this.data);
        this.layout.unlockPanel('left');
    }

    /**
     * Resets the view with a new data
     * @param data the path-finder data
     */
    public resetWithData (data: PathFinderMetadata): void {
        // Misc.
        this.data = data;
        this.grid.element.clear();

        // Path finder
        this.buildPathFinder();

        // Check
        if (!data) {
            this.layout.lockPanel('left', 'No data', false);
            return;
        }

        // Grid
        this.data.castMeshes.forEach((cm, index) => this.grid.addRecord({ recid: index, name: cm }));
        this.grid.element.refresh();
    }

    /**
     * Builds the current path finder
     */
    public buildPathFinder (): void {
        this.pathCubes.forEach(c => c.dispose());
        this.pathCubes = [];

        const context = this.canvas.getContext('2d');
        
        // No meshes
        if (!this.data || this.data.castMeshes.length === 0) {
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }
        
        const p = new PathFinder(this.data.size);
        
        // Get meshes
        const meshes: AbstractMesh[] = [];
        this.data.castMeshes.forEach(cm => {
            const m = this.editor.core.scene.getMeshByName(cm);
            if (m)
                meshes.push(m);
        });

        // Fill
        if (meshes.length === 0)
            return;
        
        p.fill(meshes, this.data.rayHeight, this.data.rayLength);

        // Update canvas
        this.canvas.width = p.width;
        this.canvas.height = p.height;

        const data = context.getImageData(0, 0, this.data.size, this.data.size);

        for (let x = 0; x < p.width; x++) {
            for (let y = 0; y < p.height; y++) {
                const coord = (y * p.width + x) * 4;
                data.data[coord] = p.buffer[x][y] * 255;
                data.data[coord + 1] = p.buffer[x][y] * 255;
                data.data[coord + 2] = p.buffer[x][y] * 255;
                data.data[coord + 3] = 255;
            }
        }

        context.putImageData(data, 0, 0, 0, 0, p.width, p.height);

        // Build spheres
        this.pathCubes.forEach(c => c.dispose());
        this.pathCubes = [];
        
        let cube: AbstractMesh = null;
        let cubeMesh: Mesh = null;

        for (let i = 0; i < p.points.length; i++) {
            const point = p.points[i];
            if (!point)
                continue;
            
            if (!cubeMesh)
                cubeMesh = cube = Mesh.CreateBox('sphere', 1, this.editor.core.scene, false);
            else
                cube = cubeMesh.createInstance('cube ' + i);
            
            cube.position = point;
            Tags.AddTagsTo(cube, 'temp');
            
            this.pathCubes.push(cube);
        }

        if (cubeMesh)
            cubeMesh.doNotSerialize = true;
    }

    /**
     * On the user clicks on the toolbar
     * @param id the id of the clicked item
     */
    protected onToolbarClicked (id: string): void {
        switch (id) {
            case 'edit': this.editor.core.onSelectObject.notifyObservers(this); break;
            default:
                // Selected an existing data?
                for (const d of this.datas) {
                    if (id === 'paths:path-' + d.name.toLowerCase()) {
                        this.resetWithData(d);
                        this.editor.core.onSelectObject.notifyObservers(this);
                        break;
                    }
                }
                break;
        }
    }

    /**
     * On add meshes
     */
    protected onAdd (): void {
        const picker = new Picker('Meshes to add as path finder surface');
        picker.addItems(this.editor.core.scene.meshes);

        // Selected items
        const meshes: AbstractMesh[] = [];
        this.data.castMeshes.forEach(cm => {
            const m = this.editor.core.scene.getMeshByName(cm);
            if (m)
                meshes.push(m);
        });
        picker.addSelected(meshes);
        picker.open(items => {
            this.data.castMeshes = [];
            this.grid.element.clear();

            items.forEach((i, index) => {
                this.data.castMeshes.push(i.name);
                this.grid.addRecord({ recid: index, name: i.name });
            });

            this.grid.element.refresh();

            this.buildPathFinder();
        });
    }

    /**
     * The user wants to delete meshes
     * @param id the ids to delete
     */
    protected onDelete (ids: number[]): void {
        let offset = 0;
        ids.forEach(id => {
            this.data.castMeshes.splice(id - offset, 1);
            offset++;
        });

        this.buildPathFinder();
    }
}
