import { extname, join } from "path/posix";
import { readdir, ensureDir } from "fs-extra";

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
    folderAbsolutePath: string,
    absolutePath: string,
    framesCount: number,
    framesPerSecond: number,
) {
    if (!editor.path) {
        return;
    }

    let files = await readdir(folderAbsolutePath);
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
        .setFfmpegPath(join(editor.path, ffmpegPath))
        .setFfprobePath(join(editor.path, ffprobePath));

    files.forEach((file) => {
        command.addInput(join(folderAbsolutePath, file));
    });

    command
        // .output(absolutePath.replace(".webm", ".mp4"))
        .fpsOutput(framesPerSecond);

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

    const tmpDirectory = join(folderAbsolutePath, "tmp");
    await ensureDir(tmpDirectory);

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

        command.mergeToFile(absolutePath.replace(".webm", ".mp4"), tmpDirectory);
    });

    clearInterval(intervalId);

    toast.dismiss(toastId);
}
