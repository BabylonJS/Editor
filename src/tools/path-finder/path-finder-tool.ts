import { AbstractEditionTool } from 'babylonjs-editor';

import PathFinderEditor from './index';

export default class PathFinderTool extends AbstractEditionTool<PathFinderEditor> {
    // Public members
    public divId: string = 'PATH-FINDER-TOOL';
    public tabName: string = 'Path Finder';

    // Private members
    private _selectedPathFinderName: string = '';

    /**
     * Constructor
     * @param editor the path finder editor
     */
    constructor () {
        super();
    }

    /**
     * Returns if the object is supported
     * @param object the object selected in the graph
     */
    public isSupported(object: any): boolean {
        return object instanceof PathFinderEditor;
    }

    /**
     * Updates the edition tool
     * @param object the object selected in the graph
     */
    public update(pathFinder: PathFinderEditor): void {
        super.update(pathFinder);

        // Properties
        const folder = this.tool.addFolder('Configuration');
        folder.open();

        folder.add(this.object.data, 'name').name('Name').onFinishChange(r => this.update(pathFinder));
        folder.add(this.object.data, 'size').name('Size').onFinishChange(r => this.object.buildPathFinder());
        folder.add(this.object.data, 'rayHeight').name('Ray Height').onFinishChange(r => this.object.buildPathFinder());
        folder.add(this.object.data, 'rayLength').name('Ray Length').onFinishChange(r => this.object.buildPathFinder());

        // Configuration list
        this._selectedPathFinderName = this.object.data.name;

        const other: string[] = [];
        this.object.datas.forEach(d => other.push(d.name));
        folder.add(this, '_selectedPathFinderName', other).name('Path Finder').onFinishChange(r => {
            const data = this.object.datas.find(d => d.name === r);
            if (!data)
                return;
            
            this.object.data = data;

            this.object.buildPathFinder();
            this.update(pathFinder);
        });
    }
}

