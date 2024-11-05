import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";
import { ArrayBufferTarget, Muxer } from "webm-muxer";

import { Tools } from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";
import { Progress } from "../../../../ui/shadcn/ui/progress";

import { Editor } from "../../../main";

import { waitNextAnimationFrame } from "../../../../tools/tools";

import { CinematicEditor } from "../editor";
import { ICinematic } from "../schema/typings";
import { generateCinematicAnimationGroup } from "../generate/generate";

export type RenderType = "720p" | "1080p" | "4k";

export interface ICinematicRendererProps {
    editor: Editor;
    cinematicEditor: CinematicEditor;
}

export interface ICinematicRendererState {
    progress: number;
    running: boolean;
}

export class CinematicRenderer extends Component<ICinematicRendererProps, ICinematicRendererState> {
    private _muxer: Muxer<ArrayBufferTarget> | null = null;
    private _videoEncoder: VideoEncoder | null = null;

    public constructor(props: ICinematicRendererProps) {
        super(props);

        this.state = {
            progress: 0,
            running: false,
        };
    }

    public render(): ReactNode {
        return (
            <div
                className={`
                    flex flex-col justify-center items-center gap-5
                    absolute top-0 left-0 w-full h-full
                    ${this.state.running
                        ? "opacity-100 bg-black/50 backdrop-blur-sm"
                        : "opacity-0 bg-transparent backdrop-blur-none pointer-events-none"
                    }
                    transition-all duration-300 ease-in-out
                `}
            >
                <Grid width={64} height={64} color="gray" />

                <div>
                    Rendering cinematic...
                </div>

                <div className="w-64">
                    <Progress value={this.state.progress} />
                </div>

                <Button onClick={() => this.setState({ running: false })}>
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
    public async renderCinematic(cinematic: ICinematic, _type: RenderType) {
        this.setState({ running: true });

        const animationGroup = generateCinematicAnimationGroup(
            cinematic,
            this.props.editor.layout.preview.scene,
        );

        const preview = this.props.editor.layout.preview;

        const width = 1920;
        const height = 1080;
        const framesCount = animationGroup.to - animationGroup.from;

        // Setup canvas and video encoder.
        this.props.editor.layout.preview.setState({
            fixedSize: {
                width,
                height,
            },
        });

        await waitNextAnimationFrame();

        this._createVideoEncoder(width, height);
        if (!this._muxer || !this._videoEncoder) {
            return;
        }

        preview.setRenderScene(false);
        preview.engine.renderEvenInBackground = true;
        preview.scene.useConstantAnimationDeltaTime = true;

        // Idea to improve quality of the render
        const scalingLevel = preview.engine._hardwareScalingLevel;
        preview.engine.setHardwareScalingLevel(scalingLevel * 0.5);

        preview.engine.resize();

        // Play cinematic
        animationGroup.play(false);

        // Render each frame into video
        for (let i = 0; i < framesCount; ++i) {
            preview.setRenderScene(true);
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

            if (!this.state.running) {
                break;
            }
        }

        // Finalize video encoder and restore canvas
        await this._videoEncoder.flush();
        this._muxer.finalize();

        preview.setRenderScene(true);
        preview.engine.renderEvenInBackground = false;
        preview.scene.useConstantAnimationDeltaTime = false;

        preview.setState({
            fixedSize: null,
        });

        await waitNextAnimationFrame();

        preview.engine.setHardwareScalingLevel(scalingLevel);
        preview.engine.resize();

        // Write video result?
        if (this.state.running) {
            const file = new File([new Blob([this._muxer.target.buffer])], "video.webm", {
                type: "video/webm",
            });

            Tools.Download(file, "video.webm");
        }

        this.setState({
            progress: 0,
            running: false,
        });
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

