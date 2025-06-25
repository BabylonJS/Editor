import sharp from "sharp";
import { writeFile } from "fs-extra";

import { toast } from "sonner";
import { ReactNode } from "react";

import { ISize } from "babylonjs";

import { IoResizeSharp } from "react-icons/io5";

import { getPowerOfTwoUntil } from "../../../../tools/maths/scalar";

import { SpinnerUIComponent } from "../../../../ui/spinner";
import {
	ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger,
} from "../../../../ui/shadcn/ui/context-menu";

import { AssetsBrowserItem } from "./item";

export class AssetBrowserImageItem extends AssetsBrowserItem {
	private _availableResizes: ISize[] = [];
	private _size = { width: 0, height: 0 } as ISize;

	private _thumbnailPath: string | null = null;

	/**
     * @override
     */
	protected getContextMenuContent(): ReactNode {
		return this._availableResizes.length > 0 && (
			<ContextMenuSub>
				<ContextMenuSubTrigger className="flex items-center gap-2">
					<IoResizeSharp className="w-5 h-5" /> Resize
				</ContextMenuSubTrigger>
				<ContextMenuSubContent>
					<ContextMenuItem disabled>Current: {this._size.width}x{this._size.height}</ContextMenuItem>
					<ContextMenuSeparator />
					{this._availableResizes.map((size) => (
						<ContextMenuItem onClick={() => this._handleResize(size.width, size.height)}>{size.width}x{size.height}</ContextMenuItem>
					))}
				</ContextMenuSubContent>
			</ContextMenuSub>
		);
	}

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

		await this._updateThumbnail();
		await this._updateAvailableSizes();
	}

	public componentWillUnmount(): void {
		super.componentWillUnmount?.();

		if (this._thumbnailPath) {
			URL.revokeObjectURL(this._thumbnailPath);
		}
	}

	private async _updateThumbnail(): Promise<void> {
		const buffer = await sharp(this.props.absolutePath).resize(256, 256).toBuffer();
		this._thumbnailPath = URL.createObjectURL(new Blob([buffer]));

		this.forceUpdate();
	}

	private async _updateAvailableSizes(): Promise<void> {
		const metadata = await sharp(this.props.absolutePath).metadata();
		if (metadata.width && metadata.height) {
			this._size.width = metadata.width;
			this._size.height = metadata.height;

			let width = metadata.width * 0.5;
			let height = metadata.height * 0.5;

			while (width > 8 && height > 8) {
				this._availableResizes.push({
					width: getPowerOfTwoUntil(width),
					height: getPowerOfTwoUntil(height),
				});

				width *= 0.5;
				height *= 0.5;
			}

			this.forceUpdate();
		}
	}

	private async _handleResize(width: number, height: number): Promise<void> {
		const selectedFiles = this.props.editor.layout.assets.state.selectedKeys;

		await Promise.all(selectedFiles.map(async (file) => {
			const availableResizes: ISize[] = [];
			const metadata = await sharp(file).metadata();

			if (metadata.width && metadata.height) {
				let width = metadata.width * 0.5;
				let height = metadata.height * 0.5;

				while (width > 8 && height > 8) {
					availableResizes.push({
						width: getPowerOfTwoUntil(width),
						height: getPowerOfTwoUntil(height),
					});

					width *= 0.5;
					height *= 0.5;
				}
			}

			const foundSize = availableResizes.find((size) => {
				return size.width === width && size.height === height;
			});

			if (!foundSize) {
				return;
			}

			const buffer = await sharp(file).resize(width, height).toBuffer();
			await writeFile(file, buffer);
		}));

		this.props.editor.layout.assets.forceUpdate();

		toast.success("Image(s) resized successfully.");
	}
}
