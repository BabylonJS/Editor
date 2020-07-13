import { AbstractInspector } from "../../../editor/inspectors/abstract-inspector";
import { FoliagePainter } from "../../../editor/painting/foliage/foliage";

export class FoliagePainterInspector extends AbstractInspector<FoliagePainter> {
    /**
     * Called on the component did mount.
     * @override
     */
    public onUpdate(): void {
        this.selectedObject = new FoliagePainter(this.editor);
        this.addOptions();
    }

    /**
     * Called on the component will unmount.
     * @override
     */
    public componentWillUnmount(): void {
        super.componentWillUnmount();
        this.selectedObject?.dispose();
    }

    /**
     * Adds the common editable properties.
     */
    protected addOptions(): void {
        const options = this.tool!.addFolder("Options");
        options.open();

        options.add(this.selectedObject, "radius").min(0).step(0.01).name("Radius");
    }
}
