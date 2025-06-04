import { readJSON } from "fs-extra";

import { ReactNode } from "react";

import { FaFilm } from "react-icons/fa";

import { CinematicEditor } from "../../cinematic/editor";
import { parseCinematic } from "../../cinematic/serialization/parse";

import { CinematicEditor as CinematicEditor2 } from "../../cinematic2/editor";
import { parseCinematic as parseCinematic2 } from "../../cinematic2/serialization/parse";

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

        if (process.env.CINEMATIC_EDITOR_2) {
            const cinematic = parseCinematic2(data, this.props.editor.layout.preview.scene);

            this.props.editor.layout.addLayoutTab("Cinematic Editor 2", (
                <CinematicEditor2
                    cinematic={cinematic}
                    editor={this.props.editor}
                    absolutePath={this.props.absolutePath}
                />
            ));
        } else {
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
}
