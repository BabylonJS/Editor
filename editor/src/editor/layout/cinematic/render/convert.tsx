import { extname, join } from "path/posix";
import { readdir, ensureDir } from "fs-extra";

import ffmpeg from "fluent-ffmpeg";

import { toast } from "sonner";

import { isWindows } from "../../../../tools/os";

import { Editor } from "../../../main";

export type CinematicEditorConvertOptions = {
    editor: Editor;
    folderAbsolutePath: string;
    absolutePath: string;
    framesCount: number;
    framesPerSecond: number;
};

export async function convertCinematicVideoToMp4(options: CinematicEditorConvertOptions) {
    if (!options.editor.path) {
        return;
    }

    let files = await readdir(options.folderAbsolutePath);
    files = files.filter((file) => extname(file) === ".webm");
    files.sort((a, b) => parseInt(a) - parseInt(b));

    let ffmpegPath = process.env.DEBUG
        ? "bin/ffmpeg"
        : "../../bin/ffmpeg";

    let ffprobePath = process.env.DEBUG
        ? "bin/ffprobe"
        : "../../bin/ffprobe";

    if (isWindows()) {
        ffmpegPath = ffmpegPath + ".exe";
        ffprobePath = ffprobePath + ".exe";
    }

    const command = ffmpeg()
        .setFfmpegPath(join(options.editor.path, ffmpegPath))
        .setFfprobePath(join(options.editor.path, ffprobePath));

    files.forEach((file) => {
        command.addInput(join(options.folderAbsolutePath, file));
    });

    command
        .fpsOutput(options.framesPerSecond);

    let converting = true;
    const intervalId = window.setInterval(() => {
        if (!converting) {
            command.kill("SIGKILL");
        }
    }, 150);

    let progress: CinematicConvertProgressComponent | null = null;
    const toastId = toast(
        <CinematicConvertProgressComponent
            ref={(r) => progress = r}
            onCancel={() => converting = false}
        />,
        {
            dismissible: false,
            duration: Infinity,
        });

    const tmpDirectory = join(options.folderAbsolutePath, "tmp");
    await ensureDir(tmpDirectory);

    await new Promise<void>((resolve, reject) => {
        command.on("end", (stdout, stderr) => {
            if (stdout) {
                options.editor.layout.console.log(stdout);
            }

            if (stderr) {
                options.editor.layout.console.log(stderr);
            }

            resolve();
        });

        command.on("progress", (p) => {
            progress?.setProgress(((p.frames / options.framesCount) * 100) >> 0);
        });

        command.on("error", (err, _, stderr) => {
            if (stderr) {
                options.editor.layout.console.error(stderr);
            }

            if (!converting) {
                resolve();
            } else {
                reject(err);
            }
        });

        command.mergeToFile(options.absolutePath.replace(".webm", ".mp4"), tmpDirectory);
    });

    clearInterval(intervalId);

    toast.dismiss(toastId);
}

import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";

import { Button } from "../../../../ui/shadcn/ui/button";
import { Progress } from "../../../../ui/shadcn/ui/progress";

export interface ICinematicConvertProgressComponentProps {
    onCancel: () => void;
}

export interface IEditorExportProjectProgressComponentState {
    progress: number;
}

export class CinematicConvertProgressComponent extends Component<ICinematicConvertProgressComponentProps, IEditorExportProjectProgressComponentState> {
    public constructor(props: ICinematicConvertProgressComponentProps) {
        super(props);

        this.state = {
            progress: 0,
        };
    }

    public render(): ReactNode {
        return (
            <div className="flex gap-5 items-center w-full">
                <Grid width={24} height={24} color="gray" />

                <div className="flex flex-col gap-2 w-full">
                    <div className="flex gap-5 items-center justify-between text-lg font-[400]">
                        Converting mp4...
                        <Button variant="ghost" onClick={() => this.props.onCancel()}>
                            Cancel
                        </Button>
                    </div>
                    <Progress value={this.state.progress} />
                </div>
            </div>
        );
    }

    public setProgress(progress: number): void {
        this.setState({ progress });
    }
}
