import { readJSON } from "fs-extra";

import { ReactNode } from "react";

import { FaFilm } from "react-icons/fa";

import { parseCinematic } from "../../animation/cinematic/parse";

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

        this.props.editor.layout.selectTab("animations");
        this.props.editor.layout.animations.setEditedCinematic(cinematic);
    }
}
