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
    colors.open();

    this.tool.addColor(colors, 'Ambient', scene.ambientColor).open();
    this.tool.addColor(colors, 'Clear', scene.clearColor).open();

    // Image processing
    scene.imageProcessingConfiguration.exposure;
    scene.imageProcessingConfiguration.contrast;
    scene.imageProcessingConfiguration.toneMappingEnabled;

    const imageProcessing = this.tool.addFolder('Image Processing');
    imageProcessing.add(scene.imageProcessingConfiguration, 'exposure').step(0.01).name('Exposure');
    imageProcessing.add(scene.imageProcessingConfiguration, 'contrast').step(0.01).name('Contrast');
    imageProcessing.add(scene.imageProcessingConfiguration, 'toneMappingEnabled').name('Tone Mapping Enabled');

    // Collisions
    const collisions = this.tool.addFolder('Collisions');
    collisions.open();

    collisions.add(scene, 'collisionsEnabled').name('Collisions Enabled');
    this.tool.addVector(collisions, 'Gravity', scene.gravity);

    // Etc.
  }
}
