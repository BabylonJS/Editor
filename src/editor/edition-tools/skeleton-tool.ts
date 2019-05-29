import { AbstractMesh, Skeleton, Tags, Vector3 } from 'babylonjs';

import AbstractEditionTool from './edition-tool';

export default class SkeletonTool extends AbstractEditionTool<Skeleton> {
    // Public members
    public divId: string = 'SKELETON-TOOL';
    public tabName: string = 'Skeleton';

    // Private members
    private _skeleton: Skeleton = null;

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported (object: any): boolean {
        return object instanceof Skeleton || object.skeleton && object instanceof AbstractMesh;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update (object: AbstractMesh | Skeleton): void {
        // Get skeleton
        if (object instanceof Skeleton)
            this._skeleton = object;
        else
            this._skeleton = object.skeleton;
        
        // Super
        super.update(this._skeleton);

        // Reset
        if (this._skeleton['metadata'] && this._skeleton['metadata'].original)
            this.tool.add(this, 'resetToOriginal').name('Reset to original');

        // Common
        const common = this.tool.addFolder('Common');
        common.open();

        common.add(this._skeleton, 'name').name('Name').onFinishChange(r => this.editor.graph.renameNode(this._skeleton.id, r));

        if (this._skeleton.needInitialSkinMatrix !== undefined)
            common.add(this._skeleton, 'needInitialSkinMatrix').name('Need Initial Skin Matrix');

        if (this._skeleton.dimensionsAtRest)
            this.tool.addVector(common, 'Dimensions At Rest', this._skeleton.dimensionsAtRest).open();
    }

    /**
     * Resets the skeleton light to the original one
     */
    protected resetToOriginal (): void {
        const m = this._skeleton['metadata'].original;
        
        this._skeleton.name = m.name;
        this._skeleton.needInitialSkinMatrix = m.needInitialSkinMatrix;
        if (m.dimensionsAtRest)
            this._skeleton.dimensionsAtRest = Vector3.FromArray(m.dimensionsAtRest);

        setTimeout(() => {
            Tags.RemoveTagsFrom(this.object, 'modified');
            this.editor.graph.updateObjectMark(this._skeleton);
        }, 1);

        this.editor.inspector.updateDisplay();
    }
}
