import { readJSON } from "fs-extra";

import { ReactNode } from "react";

import { FaFilm } from "react-icons/fa";

import { CinematicEditor } from "../../cinematic/editor";
import { parseCinematic } from "../../cinematic/serialization/parse";

import { AssetsBrowserItem } from "./item";

export class AssetBrowserCinematicItem extends AssetsBrowserItem {
    /**
     * @override
     */
    protected getIcon(): ReactNode {
        return <FaFilm size="64px" />;
    }

    /**
     * @override
     */
    protected async onDoubleClick(): Promise<void> {
        const data = await readJSON(this.props.absolutePath);
        const cinematic = parseCinematic(data, this.props.editor.layout.preview.scene);

        this.props.editor.layout.addLayoutTab("Cinematic Editor", (
            <CinematicEditor
                cinematic={cinematic}
                editor={this.props.editor}
                absolutePath={this.props.absolutePath}
            />
        ));
    }
}
