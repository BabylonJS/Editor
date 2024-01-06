import sharp from "sharp";
import { ReactNode } from "react";

import { SpinnerUIComponent } from "../../../ui/spinner";

import { AssetsBrowserItem } from "./item";

export class AssetBrowserImageItem extends AssetsBrowserItem {
    private _thumbnailPath: string | null = null;

    /**
     * @override
     */
    protected getIcon(): ReactNode {
        if (this._thumbnailPath) {
            return <img alt="" src={this._thumbnailPath} className="w-[120px] aspect-square object-contain" />;
        } else {
            return <SpinnerUIComponent width="64px" />;
        }
    }

    public async componentDidMount(): Promise<void> {
        super.componentDidMount();

        const buffer = await sharp(this.props.absolutePath).resize(256, 256).toBuffer();
        this._thumbnailPath = URL.createObjectURL(new Blob([buffer.buffer]));

        this.forceUpdate();
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount?.();

        if (this._thumbnailPath) {
            URL.revokeObjectURL(this._thumbnailPath);
        }
    }
}
