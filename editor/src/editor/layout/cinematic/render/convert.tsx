import { join } from "path/posix";

import ffmpeg from "fluent-ffmpeg";

import { toast } from "sonner";

import { isWindows } from "../../../../tools/os";

import { Editor } from "../../../main";

import { CinematicConvertProgressComponent } from "./progress";

/**
 * Converts the video located at the given aboslute path to mp4.
 * @param editor defines the reference to the editor.
 * @param absolutePath defines the absolute path to the video file to convert to mp4. Typically the webm video previously rendered.
 * @param framesCount defines the total number of frames to convert.
 */
export async function convertCinematicVideoToMp4(
    editor: Editor,
    absolutePath: string,
    framesCount: number,
) {
    if (!editor.path) {
        return;
    }

    let ffmpegPath = process.env.DEBUG
        ? "bin/ffmpeg"
        : "../../bin/ffmpeg";

    if (isWindows()) {
        ffmpegPath = ffmpegPath + ".exe";
    }

    const command = ffmpeg(absolutePath)
        .setFfmpegPath(join(editor.path, ffmpegPath));

    command
        .output(absolutePath.replace(".webm", ".mp4"));

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

    await new Promise<void>((resolve, reject) => {
        command.on("end", (stdout, stderr) => {
            if (stdout) {
                editor.layout.console.log(stdout);
            }

            if (stderr) {
                editor.layout.console.log(stderr);
            }

            resolve();
        });

        command.on("progress", (p) => {
            progress?.setProgress(((p.frames / framesCount) * 100) >> 0);
        });

        command.on("error", (err, _, stderr) => {
            if (stderr) {
                editor.layout.console.error(stderr);
            }

            if (!converting) {
                resolve();
            } else {
                reject(err);
            }
        });

        command.run();
    });

    clearInterval(intervalId);

    toast.dismiss(toastId);
}
