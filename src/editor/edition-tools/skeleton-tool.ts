import { AbstractMesh, Skeleton } from 'babylonjs';

import AbstractEditionTool from './edition-tool';
import Tools from '../tools/tools';

export default class SkeletonTool extends AbstractEditionTool<Skeleton> {
    // Public members
    public divId: string = 'SKELETON-TOOL';
    public tabName: string = 'Skeleton';

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
        let skeleton: Skeleton = null;

        if (object instanceof Skeleton)
            skeleton = object;
        else
            skeleton = object.skeleton;
        
        // Super
        super.update(skeleton);

        // Common
        const common = this.tool.addFolder('Common');
        common.open();

        common.add(skeleton, 'name').name('Name').onFinishChange(r => this.editor.graph.renameNode(skeleton.id, r));

        if (skeleton.needInitialSkinMatrix !== undefined)
            common.add(skeleton, 'needInitialSkinMatrix').name('Need Initial Skin Matrix');

        if (skeleton.dimensionsAtRest)
            this.tool.addVector(common, 'Dimensions At Rest', skeleton.dimensionsAtRest).open();
        
    }
}
