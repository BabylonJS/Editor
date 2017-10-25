import { Scene } from 'babylonjs';
import AbstractEditionTool from './edition-tool';

export default class SceneTool extends AbstractEditionTool<Scene> {
  // Public members
  public divId: string = 'SCENE-TOOL';
  public tabName: string = 'Scene';

  // Private members

  /**
   * Returns if the object is supported
   * @param object the object selected in the graph
   */
  public isSupported(object: any): boolean {
    return object instanceof Scene;
  }

  /**
   * Updates the edition tool
   * @param object the object selected in the graph
   */
  public update(scene: Scene): void {
    super.update(scene);

    // Colors
    const colors = this.tool.addFolder('Colors');
    const ambient = colors.addFolder('Ambient');
  }
}
