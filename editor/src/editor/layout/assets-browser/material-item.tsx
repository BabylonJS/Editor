import { ReactNode } from "react";

import { GiMaterialsScience } from "react-icons/gi";

import { AssetsBrowserItem } from "./item";

export class AssetBrowserMaterialItem extends AssetsBrowserItem {
    /**
     * @override
     */
    protected getIcon(): ReactNode {
        return <GiMaterialsScience size="64px" />;
    }
}
