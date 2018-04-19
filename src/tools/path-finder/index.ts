import { AbstractMesh } from 'babylonjs';
import Editor, {
    Layout,
    Edition,
    Grid, GridRow,
    Picker,

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
    public grid: Grid<PathFinderGrid> = null;

    public datas: PathFinderMetadata[] = [];
    public data: PathFinderMetadata = null;

    // Protected members
    protected canvas: HTMLCanvasElement = null;
    protected pathSpheres: AbstractMesh[] = [];

    protected onResize = () => this.layout.element.resize();

    /**
     * On load the extension for the first time
     */
    public static OnLoaded (editor: Editor): void {
        editor.edition.addTool(new PathFinderTool());
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
        this.layout.element.destroy();

        // Events
        this.editor.core.onResize.removeCallback(this.onResize);

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        const scene = this.editor.core.scene;

        // Get data
        scene.metadata = scene.metadata || { };

        scene.metadata['PathFinderExtension'] = scene.metadata['PathFinderExtension'] || [{
            name: 'New path finder configuration',
            rayHeight: 10,
            size: 100,
            castMeshes: [],
            rayLength: 100
        }];

        this.datas = scene.metadata['PathFinderExtension'];
        this.data = this.datas[0];

        // Create layout
        this.layout = new Layout('PathFinder');
        this.layout.panels = [
            { type: 'left', content: '<div id="PATH-FINDER-MESHES" style="width: 100%; height: 100%;"></div>', size: '50%', resizable: true },
            { type: 'main', content: '<canvas id="PATH-FINDER-PREVIEW" style="width: 100%; height: 100%;"></canvas>', resizable: true, size: '50%' }
        ];
        this.layout.build(this.divElement.id);

        // Add grid
        this.grid = new Grid<PathFinderGrid>('PathFinderGrid', {
            toolbarSearch: false,
            toolbarAdd: true,
            toolbarDelete: true,
            toolbarEdit: true
        });
        this.grid.onAdd = () => this.onAdd();
        this.grid.onDelete = (id) => this.onDelete(id);
        this.grid.columns = [{ field: 'name', caption: 'Name', size: '100%' }];
        this.grid.build('PATH-FINDER-MESHES');

        this.data.castMeshes.forEach((cm, index) => this.grid.addRecord({ recid: index, name: cm }));
        this.grid.element.refresh();

        // Get canvas
        this.canvas = <HTMLCanvasElement> $('#PATH-FINDER-PREVIEW')[0];
        this.canvas.addEventListener('click', () => this.editor.edition.setObject(this));

        // Events
        this.editor.core.onResize.add(this.onResize);

        // Request extension
        Extensions.RequestExtension(this.editor.core.scene, 'PathFinderExtension');
    }

    /**
     * On the user shows the plugin
     */
    public onShow (): void {
        this.onResize();
        this.pathSpheres.forEach(ps => ps.isVisible = false);
    }

    /**
     * On the user hides the plugin
     */
    public onHide (): void {
        this.pathSpheres.forEach(ps => ps.isVisible = true);
    }

    /**
     * Builds the current path finder
     */
    public buildPathFinder (): void {
        if (this.data.castMeshes.length === 0)
            return;
        
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

        const context = this.canvas.getContext('2d');
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
