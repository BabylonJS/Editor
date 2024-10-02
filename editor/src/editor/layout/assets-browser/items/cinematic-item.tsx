import { readJSON } from "fs-extra";

import { ReactNode } from "react";

import { FaFilm } from "react-icons/fa";

import { parseCinematic } from "../../cinematic/serialization/parse";
import { generateCinematicAnimationGroup } from "../../cinematic/generate/generate";

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
        const cinematic = parseCinematic(await readJSON(this.props.absolutePath), this.props.editor.layout.preview.scene);
        generateCinematicAnimationGroup(cinematic, this.props.editor.layout.preview.scene);
    }
}
