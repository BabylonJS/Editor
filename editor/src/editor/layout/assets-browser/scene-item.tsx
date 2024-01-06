import { ReactNode } from "react";

import { SiBabylondotjs } from "react-icons/si";

import { AssetsBrowserItem } from "./item";

export class AssetBrowserSceneItem extends AssetsBrowserItem {
    /**
     * @override
     */
    protected getIcon(): ReactNode {
        return <SiBabylondotjs size="64px" />;
    }
}
