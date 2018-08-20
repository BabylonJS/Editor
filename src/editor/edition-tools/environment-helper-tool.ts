import { Mesh } from 'babylonjs';

import AbstractEditionTool from './edition-tool';
import SceneManager from '../scene/scene-manager';

export default class EnvironmentHelperTool extends AbstractEditionTool<Mesh> {
    // Public members
    public divId: string = 'ENVIRONMENT-HELPER-TOOL';
    public tabName: string = 'Environment Helper';

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return SceneManager.EnvironmentHelper && SceneManager.EnvironmentHelper.rootMesh === object;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(mesh: Mesh): void {
        super.update(mesh);
        const helper = SceneManager.EnvironmentHelper;

        // Ground color
        const ground = this.tool.addFolder('Ground');
        ground.open();

        ground.add(helper['_options'], 'enableGroundMirror').onChange(r => SceneManager.EnvironmentHelper.updateOptions({
            enableGroundMirror: helper['_options'].enableGroundMirror
        }));

        this.tool.addColor(ground, 'Color', helper['_options'].groundColor, () => SceneManager.EnvironmentHelper.updateOptions({
            groundColor: helper['_options'].groundColor
        })).open();

        // Skybox
        const skybox = this.tool.addFolder('Skybox');
        skybox.open();

        this.tool.addColor(skybox, 'Color', helper['_options'].skyboxColor, () => SceneManager.EnvironmentHelper.updateOptions({
            skyboxColor: helper['_options'].skyboxColor
        })).open();
    }
}
