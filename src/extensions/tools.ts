import { FilesInput } from 'babylonjs';
import Extensions from './extensions';

import CodeExtension from './behavior/code';
import PostProcessCreatorExtension from './post-process-creator/post-process-creator';
import MaterialCreatorExtension from './material-creator/material-creator';

export default class Tools {
    /**
     * Returns a custom material by giving its name
     * @param name the name of the custom material
     */
    public getCustomMaterial (name: string): any {
        const ext = <MaterialCreatorExtension> Extensions.Instances['MaterialCreatorExtension'];
        if (!ext)
            return null;

        return ext.instances[name];
    }

    /**
     * Returns a custom script given by its object attached to
     * and the name of the script
     * @param object the object containing the script
     * @param name the name of the script
     */
    public getCustomScript (objectName: string, name: string): any {
        const ext = <CodeExtension> Extensions.Instances['BehaviorExtension'];
        if (!ext)
            return null;

        return ext.instances[objectName + name];
    }
    
    /**
     * Returns the post-process by giving its name
     * @param name the name of the post-process
     */
    public getCustomPostProcess (name: string): any {
        const ext = <PostProcessCreatorExtension> Extensions.Instances['PostProcessCreatorExtension'];
        if (!ext)
            return null;

        return ext.instances[name];
    }

    /**
     * Returns a file given by its name
     * @param name the name of the file
     */
    public getFileByName (name: string): File {
        return BABYLON.FilesInput.FilesToLoad[name];
    }
}
