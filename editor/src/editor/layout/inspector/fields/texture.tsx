import { clipboard } from "electron";
import { pathExists } from "fs-extra";
import { extname, join, dirname, basename } from "path/posix";

import sharp from "sharp";

import { Component, DragEvent, PropsWithChildren, ReactNode } from "react";

import { toast } from "sonner";

import { SiDotenv } from "react-icons/si";
import { IoIosColorPalette } from "react-icons/io";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { MdOutlineQuestionMark } from "react-icons/md";

import { CubeTexture, Scene, Texture, ColorGradingTexture } from "babylonjs";

import { isScene } from "../../../../tools/guards/scene";
import { registerUndoRedo } from "../../../../tools/undoredo";
import { updateIblShadowsRenderPipeline } from "../../../../tools/light/ibl";
import { onSelectedAssetChanged, onTextureAddedObservable } from "../../../../tools/observables";
import { isColorGradingTexture, isCubeTexture, isTexture } from "../../../../tools/guards/texture";

import { projectConfiguration } from "../../../../project/configuration";

import { configureImportedTexture } from "../../preview/import/import";

import { EXRIcon } from "../../../../ui/icons/exr";
import { Button } from "../../../../ui/shadcn/ui/button";
import { SpinnerUIComponent } from "../../../../ui/spinner";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../ui/shadcn/ui/popover";

import { EditorInspectorListField } from "./list";
import { EditorInspectorNumberField } from "./number";
import { EditorInspectorSwitchField } from "./switch";
import { EditorInspectorSectionField } from "./section";

export interface IEditorInspectorTextureFieldProps extends PropsWithChildren {
	title: string;
	property: string;
	accept3dlTexture?: boolean;
	acceptCubeTexture?: boolean;
	object: any;

	noUndoRedo?: boolean;

	hideLevel?: boolean;
	hideSize?: boolean;
	hideInvert?: boolean;
	noPopover?: boolean;

	scene?: Scene;
	onChange?: (texture: Texture | CubeTexture | ColorGradingTexture | null) => void;
}

export interface IEditorInspectorTextureFieldState {
	dragOver: boolean;

	previewError: boolean;
	previewTemporaryUrl: string | null;
}

export class EditorInspectorTextureField extends Component<IEditorInspectorTextureFieldProps, IEditorInspectorTextureFieldState> {
	public constructor(props: IEditorInspectorTextureFieldProps) {
		super(props);

		this.state = {
			dragOver: false,
			previewError: false,
			previewTemporaryUrl: null,
		};

		this._computeTemporaryPreview();
	}

	public render(): ReactNode {
		const texture = this.props.object[this.props.property] as Texture | CubeTexture | ColorGradingTexture;
		const textureUrl = (isTexture(texture) || isCubeTexture(texture) || isColorGradingTexture(texture)) && texture.url;

		return (
			<div
				onDrop={(ev) => this._handleDrop(ev)}
				onDragOver={(ev) => this._handleDragOver(ev)}
				onDragLeave={(ev) => this._handleDragLeave(ev)}
				className={`flex flex-col w-full p-5 rounded-lg ${this.state.dragOver ? "bg-muted-foreground/75 dark:bg-muted-foreground/20" : "bg-muted-foreground/10 dark:bg-muted-foreground/5"} transition-all duration-300 ease-in-out`}
			>
				<div className="flex gap-4 w-full">
					{this._getPreviewComponent(textureUrl)}

					<div className="flex flex-col w-full">
						<div className="flex flex-col px-2">
							<div>{this.props.title}</div>
							{this.state.previewError && textureUrl && (
								<div className="text-red-500 text-sm cursor-pointer" onClick={() => this._copyMissingTexture(textureUrl)}>
									...{textureUrl.substring(Math.max(0, textureUrl.length - 30))}
								</div>
							)}
						</div>

						{textureUrl && !texture.loadingError && (
							<div className="flex flex-col gap-1 mt-1 w-full">
								{!this.props.hideLevel && (
									<EditorInspectorNumberField
										noUndoRedo={this.props.noUndoRedo}
										label="Level"
										object={texture}
										property="level"
										onChange={() => this.props.onChange?.(texture)}
										onFinishChange={() => this.props.onChange?.(texture)}
									/>
								)}

								{isTexture(texture) && (
									<>
										{!this.props.hideSize && (
											<EditorInspectorNumberField
												noUndoRedo={this.props.noUndoRedo}
												label="Size"
												object={texture}
												property="uScale"
												onChange={(v) => (texture.vScale = v)}
												onFinishChange={() => this.props.onChange?.(texture)}
											/>
										)}

										{!this.props.hideInvert && (
											<EditorInspectorSwitchField
												noUndoRedo={this.props.noUndoRedo}
												label="Invert Y"
												object={texture}
												property="_invertY"
												onChange={() => {
													this._handleReloadTexture(texture);
													this.props.onChange?.(texture);
												}}
											/>
										)}
									</>
								)}

								{isCubeTexture(texture) && (
									<>
										<EditorInspectorNumberField
											label="Rotation Y"
											object={texture}
											property="rotationY"
											onFinishChange={() => this.props.onChange?.(texture)}
										/>
									</>
								)}
							</div>
						)}

						{(texture?.loadingError ?? false) && (
							<div className="flex flex-col gap-2">
								<div className="px-2 text-red-300">
									Failed to load texture
									<br />
									Please ensure the file exists at the specified path: <b className="text-red-500">{textureUrl}</b>
								</div>

								<Button variant="secondary" onClick={() => (isTexture(texture) || isCubeTexture(texture)) && this._handleReloadTexture(texture)}>
									Reload
								</Button>
							</div>
						)}
					</div>
					<div
						onClick={() => {
							const oldTexture = this.props.object[this.props.property];

							this.props.object[this.props.property] = null;
							this.props.onChange?.(null);

							if (!this.props.noUndoRedo) {
								registerUndoRedo({
									executeRedo: true,
									undo: () => {
										this.props.object[this.props.property] = oldTexture;
										this._computeTemporaryPreview();
									},
									redo: () => {
										this.props.object[this.props.property] = null;
									},
								});
							}

							this.forceUpdate();
						}}
						className="flex justify-center items-center w-24 h-full hover:bg-muted-foreground rounded-lg transition-all duration-300"
					>
						{texture && <XMarkIcon className="w-6 h-6" />}
					</div>
				</div>

				{texture && this.props.children}
			</div>
		);
	}

	public componentWillUnmount(): void {
		if (this.state.previewTemporaryUrl) {
			URL.revokeObjectURL(this.state.previewTemporaryUrl);
		}
	}

	private _copyMissingTexture(textureUrl: string): void {
		clipboard.writeText(basename(textureUrl));
		toast.info("Texture name copied to clipboard", { duration: 3000 });
	}

	private _handleReloadTexture(texture: Texture | CubeTexture): void {
		if (!projectConfiguration.path || !texture.url) {
			return;
		}

		const wasLoadingError = texture.loadingError;

		const projectDir = join(dirname(projectConfiguration.path));
		const texturePath = texture.url.startsWith(projectDir) ? texture.url : join(projectDir, texture.url);

		texture.updateURL(texturePath, undefined, () => {
			texture["_loadingError"] = false;

			if (wasLoadingError) {
				this._computeTemporaryPreview();
			}
		});
		texture.url = texturePath.replace(join(projectDir, "/"), "");
	}

	private _getPreviewComponent(textureUrl: false | string | null): ReactNode {
		return (
			<div className={`flex justify-center items-center ${textureUrl ? "w-24 h-24" : "w-8 h-8"} aspect-square`}>
				{textureUrl && (
					<Popover open={this.props.noPopover ? false : undefined}>
						<PopoverTrigger className="w-24 h-24">
							<>
								{isCubeTexture(this.props.object[this.props.property]) ? (
									<SiDotenv className="w-24 h-24" />
								) : isColorGradingTexture(this.props.object[this.props.property]) ? (
									<IoIosColorPalette className="w-24 h-24" />
								) : extname(textureUrl).toLowerCase() === ".exr" ? (
									<EXRIcon size="96px" />
								) : this.state.previewTemporaryUrl ? (
									<img className="w-24 h-24 object-contain bg-background" src={this.state.previewTemporaryUrl} />
								) : this.state.previewError ? (
									<XMarkIcon className="w-24 h-24 bg-red-500/35 rounded-lg" />
								) : (
									<SpinnerUIComponent width="64px" />
								)}
							</>
						</PopoverTrigger>
						<PopoverContent side="left">
							<>
								{isCubeTexture(this.props.object[this.props.property])
									? this._getCubeTextureInspector()
									: isColorGradingTexture(this.props.object[this.props.property])
										? this._getColorGradingTextureInspector()
										: this._getTextureInspector()}
							</>
						</PopoverContent>
					</Popover>
				)}

				{!textureUrl && <MdOutlineQuestionMark className="w-8 h-8" />}
			</div>
		);
	}

	private _getCubeTextureInspector(): ReactNode {
		const texture = this.props.object[this.props.property] as CubeTexture;
		if (!isCubeTexture(texture)) {
			return;
		}

		return (
			<div className="flex flex-col gap-2 h-full">
				<EditorInspectorSectionField title="Common">
					<div className="flex justify-between items-center px-2 py-2">
						<div className="w-1/2">Path</div>

						<div
							onClick={() => onSelectedAssetChanged.notifyObservers(join(dirname(projectConfiguration.path!), texture.name))}
							className="text-white/50 w-full text-end overflow-hidden whitespace-nowrap text-ellipsis underline-offset-2 cursor-pointer hover:underline"
						>
							{texture.name}
						</div>
					</div>

					<EditorInspectorSwitchField label="Gamma Space" object={texture} property="gammaSpace" onChange={() => this.props.onChange?.(texture)} />
					<EditorInspectorSwitchField label="Invert Z" object={texture} property="invertZ" onChange={() => this.props.onChange?.(texture)} />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Coordinates">
					<EditorInspectorNumberField
						label="Index"
						object={texture}
						property="coordinatesIndex"
						step={1}
						min={0}
						onChange={(v) => (texture.coordinatesIndex = Math.round(v))}
						onFinishChange={() => this.props.onChange?.(texture)}
					/>

					<EditorInspectorListField
						noUndoRedo={this.props.noUndoRedo}
						label="Mode"
						object={texture}
						property="coordinatesMode"
						onChange={() => {
							this.forceUpdate();
							this.props.onChange?.(texture);
						}}
						items={[
							{ text: "Explicit", value: Texture.EXPLICIT_MODE },
							{ text: "Spherical", value: Texture.SPHERICAL_MODE },
							{ text: "Planar", value: Texture.PLANAR_MODE },
							{ text: "Cubic", value: Texture.CUBIC_MODE },
							{ text: "Projection", value: Texture.PROJECTION_MODE },
							{ text: "Skybox", value: Texture.SKYBOX_MODE },
							{ text: "Inversed Cubic", value: Texture.INVCUBIC_MODE },
							{ text: "Equirectangular", value: Texture.EQUIRECTANGULAR_MODE },
							{ text: "Fixed Equirectangular", value: Texture.FIXED_EQUIRECTANGULAR_MODE },
							{ text: "Equirectangular Mirrored", value: Texture.FIXED_EQUIRECTANGULAR_MIRRORED_MODE },
						]}
					/>
				</EditorInspectorSectionField>
			</div>
		);
	}

	private _getColorGradingTextureInspector(): ReactNode {
		const texture = this.props.object[this.props.property] as ColorGradingTexture;
		if (!isColorGradingTexture(texture)) {
			return;
		}

		return (
			<div className="flex flex-col gap-2 h-full">
				<EditorInspectorSectionField title="Common">
					<div className="flex justify-between items-center px-2 py-2">
						<div className="w-1/2">Path</div>

						<div
							onClick={() => onSelectedAssetChanged.notifyObservers(join(dirname(projectConfiguration.path!), texture.name))}
							className="text-white/50 w-full text-end overflow-hidden whitespace-nowrap text-ellipsis underline-offset-2 cursor-pointer hover:underline"
						>
							{texture.name}
						</div>
					</div>
				</EditorInspectorSectionField>
			</div>
		);
	}

	private _getTextureInspector(): ReactNode {
		const texture = this.props.object[this.props.property] as Texture;
		if (!isTexture(texture)) {
			return;
		}

		const o = {
			samplingMode: texture.samplingMode,
		};

		return (
			<div className="flex flex-col gap-2 h-full">
				<EditorInspectorSectionField title="Common">
					<div className="flex justify-between items-center px-2 py-2">
						<div className="w-1/2">Dimensions</div>

						<div className="text-white/50 w-full text-end">
							{texture.getSize().width}x{texture.getSize().height}
						</div>
					</div>
					<div className="flex justify-between items-center px-2 py-2">
						<div className="w-1/2">Path</div>

						<div
							onClick={() => onSelectedAssetChanged.notifyObservers(join(dirname(projectConfiguration.path!), texture.name))}
							className="text-white/50 w-full text-end overflow-hidden whitespace-nowrap text-ellipsis underline-offset-2 cursor-pointer hover:underline"
						>
							{texture.name}
						</div>
					</div>
					<EditorInspectorSwitchField
						noUndoRedo={this.props.noUndoRedo}
						label="Gamma Space"
						object={texture}
						property="gammaSpace"
						onChange={() => this.props.onChange?.(texture)}
					/>
					<EditorInspectorSwitchField
						noUndoRedo={this.props.noUndoRedo}
						label="Get Alpha From RGB"
						object={texture}
						property="getAlphaFromRGB"
						onChange={() => this.props.onChange?.(texture)}
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Scale">
					<EditorInspectorNumberField
						noUndoRedo={this.props.noUndoRedo}
						label="U Scale"
						object={texture}
						property="uScale"
						onChange={() => this.forceUpdate()}
						onFinishChange={() => this.props.onChange?.(texture)}
					/>
					<EditorInspectorNumberField
						noUndoRedo={this.props.noUndoRedo}
						label="V Scale"
						object={texture}
						property="vScale"
						onChange={() => this.forceUpdate()}
						onFinishChange={() => this.props.onChange?.(texture)}
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Offset">
					<EditorInspectorNumberField
						noUndoRedo={this.props.noUndoRedo}
						label="U Offset"
						object={texture}
						property="uOffset"
						onFinishChange={() => this.props.onChange?.(texture)}
					/>
					<EditorInspectorNumberField
						noUndoRedo={this.props.noUndoRedo}
						label="V Offset"
						object={texture}
						property="vOffset"
						onFinishChange={() => this.props.onChange?.(texture)}
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Coordinates">
					<EditorInspectorNumberField
						noUndoRedo={this.props.noUndoRedo}
						label="Index"
						object={texture}
						property="coordinatesIndex"
						step={1}
						min={0}
						onChange={(v) => (texture.coordinatesIndex = Math.round(v))}
						onFinishChange={() => this.props.onChange?.(texture)}
					/>
					<EditorInspectorListField
						noUndoRedo={this.props.noUndoRedo}
						label="Mode"
						object={texture}
						property="coordinatesMode"
						onChange={() => {
							this.forceUpdate();
							this.props.onChange?.(texture);
						}}
						items={[
							{ text: "Explicit", value: Texture.EXPLICIT_MODE },
							{ text: "Spherical", value: Texture.SPHERICAL_MODE },
							{ text: "Planar", value: Texture.PLANAR_MODE },
							{ text: "Cubic", value: Texture.CUBIC_MODE },
							{ text: "Projection", value: Texture.PROJECTION_MODE },
							{ text: "Skybox", value: Texture.SKYBOX_MODE },
							{ text: "Inversed Cubic", value: Texture.INVCUBIC_MODE },
							{ text: "Equirectangular", value: Texture.EQUIRECTANGULAR_MODE },
							{ text: "Fixed Equirectangular", value: Texture.FIXED_EQUIRECTANGULAR_MODE },
							{ text: "Equirectangular Mirrored", value: Texture.FIXED_EQUIRECTANGULAR_MIRRORED_MODE },
						]}
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Sampling">
					<EditorInspectorListField
						noUndoRedo={this.props.noUndoRedo}
						label="Mode"
						object={o}
						property="samplingMode"
						onChange={(v) => {
							this.forceUpdate();
							texture.updateSamplingMode(v);
							this.props.onChange?.(texture);
						}}
						items={[
							{ text: "Nearest", value: Texture.NEAREST_SAMPLINGMODE },
							{ text: "Bilinear", value: Texture.BILINEAR_SAMPLINGMODE },
							{ text: "Trilinear", value: Texture.TRILINEAR_SAMPLINGMODE },
						]}
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Wrap">
					<EditorInspectorListField
						noUndoRedo={this.props.noUndoRedo}
						label="Wrap U"
						object={texture}
						property="wrapU"
						onChange={() => this.props.onChange?.(texture)}
						items={[
							{ text: "Wrap", value: Texture.WRAP_ADDRESSMODE },
							{ text: "Clamp", value: Texture.CLAMP_ADDRESSMODE },
							{ text: "Mirror", value: Texture.MIRROR_ADDRESSMODE },
						]}
					/>
					<EditorInspectorListField
						noUndoRedo={this.props.noUndoRedo}
						label="Wrap V"
						object={texture}
						property="wrapV"
						onChange={() => this.props.onChange?.(texture)}
						items={[
							{ text: "Wrap", value: Texture.WRAP_ADDRESSMODE },
							{ text: "Clamp", value: Texture.CLAMP_ADDRESSMODE },
							{ text: "Mirror", value: Texture.MIRROR_ADDRESSMODE },
						]}
					/>
					<EditorInspectorListField
						noUndoRedo={this.props.noUndoRedo}
						label="Wrap R"
						object={texture}
						property="wrapR"
						onChange={() => this.props.onChange?.(texture)}
						items={[
							{ text: "Wrap", value: Texture.WRAP_ADDRESSMODE },
							{ text: "Clamp", value: Texture.CLAMP_ADDRESSMODE },
							{ text: "Mirror", value: Texture.MIRROR_ADDRESSMODE },
						]}
					/>
				</EditorInspectorSectionField>
			</div>
		);
	}

	private async _computeTemporaryPreview(): Promise<void> {
		const texture = this.props.object[this.props.property] as Texture | CubeTexture | null | undefined;
		if (!texture?.url || extname(texture.url).toLowerCase() === ".exr") {
			return;
		}

		const path = join(dirname(projectConfiguration.path!), texture.url);

		if (!(await pathExists(path))) {
			return this.setState({
				previewError: true,
			});
		}

		if (!isTexture(texture)) {
			return this.setState({
				previewError: false,
			});
		}

		const buffer = await sharp(path).resize(128, 128).toBuffer();

		if (this.state.previewTemporaryUrl) {
			URL.revokeObjectURL(this.state.previewTemporaryUrl);
		}

		this.setState({
			previewError: false,
			previewTemporaryUrl: URL.createObjectURL(new Blob([buffer])),
		});
	}

	private _handleDragOver(ev: DragEvent<HTMLDivElement>): void {
		ev.preventDefault();
		this.setState({ dragOver: true });
	}

	private _handleDragLeave(ev: DragEvent<HTMLDivElement>): void {
		ev.preventDefault();
		this.setState({ dragOver: false });
	}

	private _handleDrop(ev: DragEvent<HTMLDivElement>): void {
		ev.preventDefault();
		this.setState({ dragOver: false });

		const absolutePath = JSON.parse(ev.dataTransfer.getData("assets"))[0];
		const extension = extname(absolutePath).toLowerCase();

		switch (extension) {
			case ".png":
			case ".webp":
			case ".jpg":
			case ".jpeg":
			case ".bmp":
			case ".exr":
				const oldTexture = this.props.object[this.props.property];
				const newTexture = configureImportedTexture(
					new Texture(absolutePath, this.props.scene ?? (isScene(this.props.object) ? this.props.object : this.props.object.getScene()))
				);

				if (oldTexture !== newTexture) {
					this.props.object[this.props.property] = newTexture;
					this.props.onChange?.(newTexture);

					if (!this.props.noUndoRedo) {
						registerUndoRedo({
							executeRedo: true,
							undo: () => (this.props.object[this.props.property] = oldTexture),
							redo: () => (this.props.object[this.props.property] = newTexture),
							onLost: () => newTexture?.dispose(),
						});
					}

					onTextureAddedObservable.notifyObservers(newTexture);
				}

				this._computeTemporaryPreview();
				break;

			case ".3dl":
				if (this.props.accept3dlTexture) {
					const oldTexture = this.props.object[this.props.property];
					const newTexture = configureImportedTexture(
						new ColorGradingTexture(absolutePath, this.props.scene ?? (isScene(this.props.object) ? this.props.object : this.props.object.getScene()))
					);

					if (oldTexture !== newTexture) {
						this.props.object[this.props.property] = newTexture;
						this.props.onChange?.(newTexture);

						if (!this.props.noUndoRedo) {
							registerUndoRedo({
								executeRedo: true,
								undo: () => (this.props.object[this.props.property] = oldTexture),
								redo: () => (this.props.object[this.props.property] = newTexture),
								onLost: () => newTexture?.dispose(),
							});
						}

						onTextureAddedObservable.notifyObservers(newTexture);
					}
				}
				break;

			case ".env":
				if (this.props.acceptCubeTexture) {
					const oldTexture = this.props.object[this.props.property];
					const newTexture = configureImportedTexture(
						CubeTexture.CreateFromPrefilteredData(absolutePath, this.props.scene ?? (isScene(this.props.object) ? this.props.object : this.props.object.getScene()))
					);

					const scene = newTexture.getScene();

					this.props.object[this.props.property] = newTexture;
					if (scene) {
						updateIblShadowsRenderPipeline(scene, true);
					}

					this.props.onChange?.(this.props.object[this.props.property]);

					if (oldTexture !== newTexture && !this.props.noUndoRedo) {
						registerUndoRedo({
							executeRedo: true,
							undo: () => {
								this.props.object[this.props.property] = oldTexture;
								if (scene) {
									updateIblShadowsRenderPipeline(scene, true);
								}
							},
							redo: () => {
								this.props.object[this.props.property] = newTexture;
								if (scene) {
									updateIblShadowsRenderPipeline(scene, true);
								}
							},
							onLost: () => newTexture?.dispose(),
						});
					}
				}
				break;
		}

		this.forceUpdate();
	}
}
