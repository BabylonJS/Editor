import { ISize } from "babylonjs";

import { AbstractInspectorLegacy } from "../../editor/inspectors/abstract-inspector-legacy";

export abstract class PaintingInspector<T> extends AbstractInspectorLegacy<T> {
    /**
     * Resizes the edition tool.
     * @param size defines the size of the panel.
     */
    public resize(size?: ISize): void {
        size = size ?? this.editor.getPanelSize("Painting Tools");
        if (size) {
            super.resize(size);
        }
    }
}
