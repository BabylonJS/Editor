import { join } from "path/posix";

import ffmpeg from "fluent-ffmpeg";

import { Editor } from "../../../main";

/**
 * Converts the video located at the given aboslute path to mp4.
 * @param editor defines the reference to the editor.
 * @param absolutePath defines the absolute path to the video file to convert to mp4. Typically the webm video previously rendered.
 * @param onProgress defines the callback called to notify progress in conversion.
 */
export async function convertVideoToMp4(
    editor: Editor,
    absolutePath: string,
    onProgress: (frame: number) => void,
) {
    if (!editor.path) {
        return;
    }

    const ffmpegPath = process.env.DEBUG
        ? "bin/ffmpeg"
        : "../../bin/ffmpeg";

    const command = ffmpeg(absolutePath)
        .setFfmpegPath(join(editor.path, ffmpegPath));

    command
        .output(absolutePath.replace(".webm", ".mp4"));

    await new Promise<void>((resolve, reject) => {
        command.run();

        command.on("end", (stdout, stderr) => {
            if (stdout) {
                editor.layout.console.log(stdout);
            }

            if (stderr) {
                editor.layout.console.log(stderr);
            }

            resolve();
        });

        command.on("progress", (progress) => {
            onProgress(progress.frames);
        });

        command.on("error", (err, stdout, stderr) => {
            if (stdout) {
                editor.layout.console.log(stdout);
            }

            if (stderr) {
                editor.layout.console.error(stderr);
            }

            reject(err);
        });
    });
}
