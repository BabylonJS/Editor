import { Tree } from "babylonjs-editor";

import CodeProjectEditor, { Script } from "./project-editor";

export default class CodeGraph {
    // Public members
    public codeEditor: CodeProjectEditor;
    public tree: Tree;

    public scriptsRoot: string = 'SCRIPTS-ROOT';
    public postProcessesRoot: string = 'POST-PROCESSES-ROOT';

    // Static members
    public static Uid: number = 0;

    /**
     * Constructor
     * @param codeEditor the code editor reference
     */
    constructor (codeEditor: CodeProjectEditor) {
        this.codeEditor = codeEditor;

        // Build tree
        this.tree = new Tree('GRAPH');
        this.tree.wholerow = true;
        this.tree.build('GRAPH');

        // Events
        this.tree.onDblClick = <Script>(id, data) => {
            if (data && id !== this.scriptsRoot)
                this.codeEditor.codeLayout.openCode(data);
        };
    }

    /**
     * Fills the graph
     */
    public fill (): void {
        // Code extension
        const extension = this.codeEditor.editor.getExtension<any>('BehaviorExtension');
        const metadatas = extension ? extension.onSerialize() : null;

        // Clear
        this.tree.clear();
        
        // Add root
        this.tree.add({
            id: this.scriptsRoot,
            text: 'Scripts',
            img: 'icon-scene',
            data: this.codeEditor.scripts
        });

        this.tree.select(this.scriptsRoot);

        // Add scripts
        this.codeEditor.scripts.forEach(script => {
            this.tree.add({
                id: script.id,
                text: script.name,
                img: 'icon-behavior-editor',
                data: script
            }, this.scriptsRoot);

            // Add attached nodes if exists
            if (metadatas) {
                metadatas.nodes.forEach(n => {
                    const attached = n.metadatas.find(m => m.codeId === script.id);
                    if (attached) {
                        this.tree.add({
                            id: n.nodeId + (CodeGraph.Uid++).toString(),
                            text: n.node,
                            img: 'no'
                        }, script.id);
                    }
                });
            }
        });

        // Expand
        this.tree.expand(this.scriptsRoot);
        this.tree.expand(this.postProcessesRoot);
    }
}
