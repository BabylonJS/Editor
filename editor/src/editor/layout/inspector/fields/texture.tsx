import { extname, join, dirname } from "path/posix";

import sharp from "sharp";

import { Component, DragEvent, PropsWithChildren, ReactNode } from "react";

import { SiDotenv } from "react-icons/si";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { MdOutlineQuestionMark } from "react-icons/md";

import { CubeTexture, Scene, Texture } from "babylonjs";

import { isScene } from "../../../../tools/guards/scene";
import { registerUndoRedo } from "../../../../tools/undoredo";
import { isCubeTexture, isTexture } from "../../../../tools/guards/texture";
import { updateIblShadowsRenderPipeline } from "../../../../tools/light/ibl";
import { onSelectedAssetChanged, onTextureAddedObservable } from "../../../../tools/observables";

import { projectConfiguration } from "../../../../project/configuration";

import { configureImportedTexture } from "../../preview/import/import";

import { SpinnerUIComponent } from "../../../../ui/spinner";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../ui/shadcn/ui/popover";

import { EditorInspectorListField } from "./list";
import { EditorInspectorNumberField } from "./number";
import { EditorInspectorSwitchField } from "./switch";
import { EditorInspectorSectionField } from "./section";

export interface IEditorInspectorTextureFieldProps extends PropsWithChildren {
    title: string;
    property: string;
    acceptCubeTexture?: boolean;
    object: any;

    hideLevel?: boolean;
    hideSize?: boolean;

    scene?: Scene;
    onChange?: (texture: Texture | CubeTexture | null) => void;
}

export interface IEditorInspectorTextureFieldState {
    dragOver: boolean;
    previewTemporaryUrl: string | null;
}

export class EditorInspectorTextureField extends Component<IEditorInspectorTextureFieldProps, IEditorInspectorTextureFieldState> {
    public constructor(props: IEditorInspectorTextureFieldProps) {
        super(props);

        this.state = {
            dragOver: false,
            previewTemporaryUrl: null,
        };

        this._computeTemporaryPreview();
    }

    public render(): ReactNode {
        const texture = this.props.object[this.props.property] as Texture | CubeTexture;
        const textureUrl = (isTexture(texture) || isCubeTexture(texture)) && texture.url;

        return (
            <div
                onDrop={(ev) => this._handleDrop(ev)}
                onDragOver={(ev) => this._handleDragOver(ev)}
                onDragLeave={(ev) => this._handleDragLeave(ev)}
                className={`flex flex-col w-full p-5 rounded-lg ${this.state.dragOver ? "bg-muted-foreground/75 dark:bg-muted-foreground/20" : "bg-muted-foreground/10 dark:bg-muted-foreground/5"} transition-all duration-300 ease-in-out`}
            >
                <div className="flex gap-4 w-full">
                    {texture &&
                        this._getPreviewComponent(textureUrl)
                    }

                    {!texture && this._getPreviewComponent(textureUrl)}

                    <div className="flex flex-col w-full">
                        <div className="px-2">
                            {this.props.title}
                        </div>

                        {textureUrl &&
                            <div className="flex flex-col gap-1 mt-1 w-full">
                                {!this.props.hideLevel &&
                                    <EditorInspectorNumberField label="Level" object={texture} property="level" />
                                }

                                {!isCubeTexture(texture) &&
                                    <>
                                        {!this.props.hideSize &&
                                            <EditorInspectorNumberField label="Size" object={texture} property="uScale" onChange={(v) => {
                                                texture.vScale = v;
                                            }} />
                                        }
                                        <EditorInspectorSwitchField label="Invert Y" object={texture} property="_invertY" onChange={() => {
                                            this._handleReloadTexture(texture);
                                        }} />
                                    </>
                                }

                                {isCubeTexture(texture) &&
                                    <>
                                        <EditorInspectorNumberField label="Rotation Y" object={texture} property="rotationY" />
                                    </>
                                }
                            </div>
                        }
                    </div>
                    <div
                        onClick={() => {
                            const oldTexture = this.props.object[this.props.property];

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

                            this.forceUpdate();
                        }}
                        className="flex justify-center items-center w-24 h-full hover:bg-muted-foreground rounded-lg transition-all duration-300"
                    >
                        <XMarkIcon className="w-6 h-6" />
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

    private _handleReloadTexture(texture: Texture | CubeTexture): void {
        if (!projectConfiguration.path || !texture.url) {
            return;
        }

        const projectDir = join(dirname(projectConfiguration.path));
        const texturePath = texture.url.startsWith(projectDir)
            ? texture.url
            : join(projectDir, texture.url);

        texture.updateURL(texturePath);
        texture.url = texturePath.replace(join(projectDir, "/"), "");
    }

    private _getPreviewComponent(textureUrl: false | string | null): ReactNode {
        return (
            <div className={`flex justify-center items-center ${textureUrl ? "w-24 h-24" : "w-8 h-8"} aspect-square`}>
                {textureUrl &&
                    <Popover>
                        <PopoverTrigger>
                            <>
                                {isCubeTexture(this.props.object[this.props.property])
                                    ? <SiDotenv className="w-24 h-24" />
                                    : this.state.previewTemporaryUrl
                                        ? <img className="w-24 h-24 object-contain" src={this.state.previewTemporaryUrl} />
                                        : <SpinnerUIComponent width="64px" />
                                }
                            </>
                        </PopoverTrigger>
                        <PopoverContent side="left">
                            <>
                                {isCubeTexture(this.props.object[this.props.property])
                                    ? this._getCubeTextureInspector()
                                    : this._getTextureInspector()
                                }
                            </>
                        </PopoverContent>
                    </Popover>
                }

                {!textureUrl && (
                    <MdOutlineQuestionMark className="w-8 h-8" />
                )}
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
                        <div className="w-1/2">
                            Path
                        </div>

                        <div
                            onClick={() => onSelectedAssetChanged.notifyObservers(join(dirname(projectConfiguration.path!), texture.name))}
                            className="text-white/50 w-full text-end overflow-hidden whitespace-nowrap text-ellipsis underline-offset-2 cursor-pointer hover:underline"
                        >
                            {texture.name}
                        </div>
                    </div>

                    <EditorInspectorSwitchField label="Gamma Space" object={texture} property="gammaSpace" />
                    <EditorInspectorSwitchField label="Invert Z" object={texture} property="invertZ" />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Coordinates">
                    <EditorInspectorNumberField label="Index" object={texture} property="coordinatesIndex" step={1} min={0} onChange={(v) => {
                        texture.coordinatesIndex = Math.round(v);
                    }} />
                    <EditorInspectorListField label="Mode" object={texture} property="coordinatesMode" onChange={() => this.forceUpdate()} items={[
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
                    ]} />
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
                        <div className="w-1/2">
                            Dimensions
                        </div>

                        <div className="text-white/50 w-full text-end">
                            {texture.getSize().width}x{texture.getSize().height}
                        </div>
                    </div>
                    <div className="flex justify-between items-center px-2 py-2">
                        <div className="w-1/2">
                            Path
                        </div>

                        <div
                            onClick={() => onSelectedAssetChanged.notifyObservers(join(dirname(projectConfiguration.path!), texture.name))}
                            className="text-white/50 w-full text-end overflow-hidden whitespace-nowrap text-ellipsis underline-offset-2 cursor-pointer hover:underline"
                        >
                            {texture.name}
                        </div>
                    </div>
                    <EditorInspectorSwitchField label="Gamma Space" object={texture} property="gammaSpace" />
                    <EditorInspectorSwitchField label="Get Alpha From RGB" object={texture} property="getAlphaFromRGB" />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Scale">
                    <EditorInspectorNumberField label="U Scale" object={texture} property="uScale" onChange={() => this.forceUpdate()} />
                    <EditorInspectorNumberField label="V Scale" object={texture} property="vScale" onChange={() => this.forceUpdate()} />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Offset">
                    <EditorInspectorNumberField label="U Offset" object={texture} property="uOffset" />
                    <EditorInspectorNumberField label="V Offset" object={texture} property="vOffset" />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Coordinates">
                    <EditorInspectorNumberField label="Index" object={texture} property="coordinatesIndex" step={1} min={0} onChange={(v) => {
                        texture.coordinatesIndex = Math.round(v);
                    }} />
                    <EditorInspectorListField label="Mode" object={texture} property="coordinatesMode" onChange={() => this.forceUpdate()} items={[
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
                    ]} />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Sampling">
                    <EditorInspectorListField
                        label="Mode"
                        object={o}
                        property="samplingMode"
                        onChange={(v) => {
                            this.forceUpdate();
                            texture.updateSamplingMode(v);
                        }}
                        items={[
                            { text: "Nearest", value: Texture.NEAREST_SAMPLINGMODE },
                            { text: "Bilinear", value: Texture.BILINEAR_SAMPLINGMODE },
                            { text: "Trilinear", value: Texture.TRILINEAR_SAMPLINGMODE },
                        ]}
                    />
                </EditorInspectorSectionField>
            </div>
        );
    }

    private async _computeTemporaryPreview(): Promise<void> {
        const texture = this.props.object[this.props.property] as Texture;
        if (!isTexture(texture) || !texture.url) {
            return;
        }

        const path = join(dirname(projectConfiguration.path!), texture.url);

        const buffer = await sharp(path).resize(128, 128).toBuffer();

        if (this.state.previewTemporaryUrl) {
            URL.revokeObjectURL(this.state.previewTemporaryUrl);
        }

        this.setState({ previewTemporaryUrl: URL.createObjectURL(new Blob([buffer.buffer])) });
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
            case ".jpg":
            case ".jpeg":
            case ".bmp":
                const oldTexture = this.props.object[this.props.property];
                const newTexture = configureImportedTexture(
                    new Texture(absolutePath, this.props.scene ?? (isScene(this.props.object) ? this.props.object : this.props.object.getScene())),
                );

                this.props.onChange?.(this.props.object[this.props.property]);

                if (oldTexture !== newTexture) {
                    registerUndoRedo({
                        executeRedo: true,
                        undo: () => this.props.object[this.props.property] = oldTexture,
                        redo: () => this.props.object[this.props.property] = newTexture,
                        onLost: () => newTexture?.dispose(),
                    });

                    onTextureAddedObservable.notifyObservers(newTexture);
                }

                this._computeTemporaryPreview();
                break;

            case ".env":
                if (this.props.acceptCubeTexture) {
                    const oldTexture = this.props.object[this.props.property];
                    const newTexture = configureImportedTexture(
                        CubeTexture.CreateFromPrefilteredData(absolutePath, this.props.scene ?? (isScene(this.props.object) ? this.props.object : this.props.object.getScene())),
                    );

                    const scene = newTexture.getScene();

                    this.props.onChange?.(this.props.object[this.props.property]);

                    if (oldTexture !== newTexture) {
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
