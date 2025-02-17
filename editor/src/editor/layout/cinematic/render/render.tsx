import { join, dirname } from "path/posix";
import { writeFile, ensureDir, remove } from "fs-extra";

import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";
import { ArrayBufferTarget, Muxer } from "webm-muxer";

import { ISize, Tools } from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";
import { Progress } from "../../../../ui/shadcn/ui/progress";

import { saveSingleFileDialog } from "../../../../tools/dialog";
import { updateLightShadowMapRefreshRate } from "../../../../tools/light/shadows";

import { Editor } from "../../../main";

import { CinematicEditor } from "../editor";
import { ICinematic } from "../schema/typings";
import { generateCinematicAnimationGroup } from "../generate/generate";

import { convertCinematicVideoToMp4 } from "./convert";

export type RenderType = "720p" | "1080p" | "4k";

export interface ICinematicRendererProps {
    editor: Editor;
    cinematicEditor: CinematicEditor;
}

export interface ICinematicRendererState {
    progress: number;
    step: "rendering" | "converting" | "void";
}

export class CinematicRenderer extends Component<ICinematicRendererProps, ICinematicRendererState> {
    private _muxer: Muxer<ArrayBufferTarget> | null = null;
    private _videoEncoder: VideoEncoder | null = null;

    public constructor(props: ICinematicRendererProps) {
        super(props);

        this.state = {
            progress: 0,
            step: "void",
        };
    }

    public render(): ReactNode {
        return (
            <div
                className={`
                    flex flex-col justify-center items-center gap-5
                    fixed top-0 left-0 w-full h-full z-50
                    ${this.state.step !== "void"
                        ? "opacity-100 bg-black/50 backdrop-blur-sm"
                        : "opacity-0 bg-transparent backdrop-blur-none pointer-events-none"
                    }
                    transition-all duration-300 ease-in-out
                `}
            >
                <Grid width={64} height={64} color="gray" />

                <div>
                    {this.state.step === "rendering" && "Rendering cinematic..."}
                </div>

                <div className="w-64">
                    <Progress value={this.state.progress} />
                </div>

                <Button onClick={() => this.setState({ step: "void" })}>
                    Cancel
                </Button>
            </div>
        );
    }

    /**
     * Renders the current cinematic into a video file.
     * @param cinematic defines the reference to the cinematic to render.
     * @param type defines the type of render to perform.
     */
    public renderCinematic(cinematic: ICinematic, type: RenderType) {
        const destination = saveSingleFileDialog({
            title: "Save cinematic video as...",
            filters: [
                { name: "WebM Video", extensions: ["webm"] },
            ],
        });

        if (!destination) {
            return;
        }

        return this._renderCinematic(cinematic, type, destination);
    }

    private async _renderCinematic(cinematic: ICinematic, type: RenderType, destination: string) {
        this.setState({
            step: "rendering",
        });

        const destinationFolder = join(dirname(destination), Tools.RandomId());
        await ensureDir(destinationFolder);

        const animationGroup = generateCinematicAnimationGroup(
            cinematic,
            this.props.editor.layout.preview.scene,
        );

        const preview = this.props.editor.layout.preview;
        const { width, height } = this._getVideoDimensions(type);
        const framesCount = animationGroup.to - animationGroup.from;

        // Setup canvas and video encoder.
        this._createVideoEncoder(width, height);
        if (!this._muxer || !this._videoEncoder) {
            return;
        }

        preview.setRenderScene(false);
        preview.engine.renderEvenInBackground = true;
        preview.scene.useConstantAnimationDeltaTime = true;

        // Idea to improve quality of the render
        const scalingLevel = preview.engine._hardwareScalingLevel;

        preview.engine.setHardwareScalingLevel(scalingLevel * 0.25);
        preview.engine.setSize(width, height);
        preview.scene.render();

        // Play cinematic
        animationGroup.play(false);

        let videoIndex = 1;

        // Render each frame into video
        for (let i = 0; i < framesCount; ++i) {
            preview.setRenderScene(true);

            preview.scene.lights.forEach((light) => {
                updateLightShadowMapRefreshRate(light);
            });

            preview.engine.beginFrame();
            preview.engine.activeRenderLoops.forEach((fn) => fn());
            preview.engine.endFrame();
            preview.setRenderScene(false);

            // if (i % 2 === 0) {
            this._encodeVideoFrame(preview.engine.getRenderingCanvas()!, this._videoEncoder, i);
            // }

            await new Promise<void>((resolve) => {
                setTimeout(() => resolve(), 0);
            });

            this.setState({
                progress: ((i / framesCount) * 100) >> 0,
            });

            if (this.state.step !== "rendering") {
                break;
            }

            if (i > 0 && i % 60 === 0) {
                await this._flushVideoEncoder(destinationFolder, videoIndex, width, height);
                ++videoIndex;
            }
        }

        animationGroup.stop();
        animationGroup.dispose();

        // Finalize video encoder and restore canvas
        await this._flushVideoEncoder(destinationFolder, videoIndex, width, height);

        preview.setRenderScene(true);
        preview.engine.renderEvenInBackground = false;
        preview.scene.useConstantAnimationDeltaTime = false;

        preview.engine.setHardwareScalingLevel(scalingLevel);
        preview.engine.resize();

        // Write video result?
        if (this.state.step === "rendering") {
            convertCinematicVideoToMp4(this.props.editor, destinationFolder, destination, framesCount, cinematic.outputFramesPerSecond)
                .catch(() => {
                    this.props.editor.layout.console.error(`Failed to convert cinematic video at: ${destination.replace(".webm", ".mp4")}`);
                })
                .finally(() => {
                    remove(destinationFolder);
                });
        }

        this.setState({
            progress: 0,
            step: "void",
        });
    }

    private async _flushVideoEncoder(destinationFolder: string, videoIndex: number, width: number, height: number): Promise<void> {
        if (!this._videoEncoder || !this._muxer) {
            return;
        }

        await this._videoEncoder.flush();
        this._muxer.finalize();

        await writeFile(join(destinationFolder, `${videoIndex}.webm`), Buffer.from(this._muxer.target.buffer));

        this._createVideoEncoder(width, height);
        if (!this._muxer || !this._videoEncoder) {
            this.setState({
                step: "void",
            });
        }
    }

    private _encodeVideoFrame(canvas: HTMLCanvasElement, videoEncoder: VideoEncoder, frame: number): void {
        const videoFrame = new VideoFrame(canvas, {
            timestamp: (1000 / 60) * frame * 1000,
        });

        videoEncoder.encode(videoFrame, {
            keyFrame: frame % 30 === 0,
        });

        videoFrame.close();
    }

    private _getVideoDimensions(type: RenderType): ISize {
        switch (type) {
            case "720p":
                return {
                    width: 1280,
                    height: 720,
                };

            case "1080p":
                return {
                    width: 1920,
                    height: 1080,
                };

            case "4k":
                return {
                    width: 3840,
                    height: 2160,
                };
        }
    }

    private _createVideoEncoder(width: number, height: number): void {
        this._muxer = new Muxer({
            target: new ArrayBufferTarget(),
            video: {
                width,
                height,
                frameRate: 60,
                codec: 'V_VP9',
            },
            firstTimestampBehavior: "offset",
        });

        this._videoEncoder = new VideoEncoder({
            error: (e) => {
                console.error(e);
            },
            output: (chunk, meta) => {
                this._muxer!.addVideoChunk(chunk, meta);
            },
        });

        this._videoEncoder.configure({
            width,
            height,
            framerate: 60,
            bitrate: 20_000_000,
            codec: "vp09.00.10.08",
            latencyMode: "quality",
        });
    }
}

