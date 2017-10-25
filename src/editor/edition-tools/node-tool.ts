import { Node, Vector3 } from 'babylonjs';
import AbstractEditionTool from './edition-tool';

export default class NodeTool extends AbstractEditionTool<Node> {
  // Public members
  public divId: string = 'NODE-TOOL';
  public tabName: string = 'Node';

  // Private members

  /**
   * Returns if the object is supported
   * @param object the object selected in the graph
   */
  public isSupported(object: any): boolean {
    return object instanceof Node;
  }

  /**
   * Updates the edition tool
   * @param object the object selected in the graph
   */
  public update(node: Node): void {
    super.update(node);

    // Common
    const common = this.tool.addFolder('Common');
    common.add(node, 'name').name('Name').onFinishChange(r => this.core.graph.renameNode(node.id, r));

    // Transforms
    if (node['position'])
        this.tool.addVector(this.tool.element, 'Position', node['position']).open();

    if (node['rotation'])
        this.tool.addVector(this.tool.element, 'Rotation', node['rotation']).open();

    if (node['scaling'])
        this.tool.addVector(this.tool.element, 'Scaling', node['scaling']).open();
  }
}
