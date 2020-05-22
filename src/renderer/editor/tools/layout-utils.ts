import { Nullable } from "../../../shared/types";

export class LayoutUtils {
    /**
     * Clears the contents of the serialized layout.
     */
    public static ClearLayoutContent(editor: any, content: Nullable<any[]>): void {
        if (!content) { return; }
        content.forEach((c) => {
            if (c.props) { c.props = { }; }
            if (c.componentState) { delete c.componentState; }

            this.ClearLayoutContent(editor, c.content);
        });
    }

    /**
     * Configures the contents of the serialized layout.
     */
    public static ConfigureLayoutContent(editor: any, content: Nullable<any[]>): void {
        if (!content) { return; }
        content.forEach((c) => {
            if (c.props) { c.props = { editor, id: c.id }; }
            this.ConfigureLayoutContent(editor, c.content);
        });
    }
}
