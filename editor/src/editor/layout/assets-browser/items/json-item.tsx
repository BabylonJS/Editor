import { join, dirname } from "path/posix";
import { pathExists, readJSON } from "fs-extra";

import { ReactNode } from "react";
import { VscJson } from "react-icons/vsc";

import { normalizeAtlasJson } from "babylonjs-editor-tools";

import { SpinnerUIComponent } from "../../../../ui/spinner";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../ui/shadcn/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";

import { computeSpritePreviewImagesFromAtlasJson } from "../../../../tools/sprite/atlas-json";

import { AssetsBrowserItem } from "./item";

export class AssetBrowserJsonItem extends AssetsBrowserItem {
	public type: "json" | "spritesheet" | "unknown" = "unknown";

	private _data: any = null;

	/**
	 * @override
	 */
	protected getIcon(): ReactNode {
		if (this.type === "spritesheet") {
			return this._getSpritesheetPreviews();
		}

		if (this.type === "json") {
			return <VscJson size="64px" />;
		}

		return <SpinnerUIComponent width="64px" />;
	}

	public async componentDidMount(): Promise<void> {
		await super.componentDidMount();
		this._processJson();
	}

	private async _processJson(): Promise<void> {
		if (!(await pathExists(this.props.absolutePath))) {
			return;
		}

		this._data = await readJSON(this.props.absolutePath);

		if (this._data.frames && this._data.meta?.image && typeof this._data.meta.image === "string") {
			return this._processSpriteSheetPreview();
		}

		this.type = "json";
		this.forceUpdate();
	}

	private async _processSpriteSheetPreview(): Promise<void> {
		this.type = "spritesheet";

		const imagePath = join(dirname(this.props.absolutePath), this._data.meta.image);

		normalizeAtlasJson(this._data);
		await computeSpritePreviewImagesFromAtlasJson(this._data, imagePath);

		this.forceUpdate();
	}

	private _getSpritesheetPreviews(): ReactNode {
		return (
			<Popover modal={false}>
				<PopoverTrigger className="flex justify-center items-center w-[80px] aspect-square ring-yellow-500 ring-2 rounded-lg">
					<VscJson size="64px" />
				</PopoverTrigger>
				<PopoverContent className="flex flex-col w-fit">
					<div className="text-center font-semibold text-xl">Spritesheet</div>
					<div className="text-center">{this._data.meta.image}</div>

					<TooltipProvider delayDuration={0}>
						<div className="grid grid-cols-10 gap-2 pt-4 max-h-96 overflow-y-auto">
							{this._data.frames.map((f: any, index: number) => (
								<Tooltip key={index}>
									<TooltipTrigger>
										<div className="flex justify-center items-center w-14 h-14 p-2 bg-secondary rounded-lg cursor-pointer hover:bg-background transition-all duration-300 ease-in-out">
											<img draggable src={f._preview} className="w-full h-full object-contain" />
										</div>
									</TooltipTrigger>
									<TooltipContent>{f.filename}</TooltipContent>
								</Tooltip>
							))}
						</div>
					</TooltipProvider>
				</PopoverContent>
			</Popover>
		);
	}
}
