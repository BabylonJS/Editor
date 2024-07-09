import { platform } from "os";
import { exec } from "child_process";

/**
 * Get the file path argument from the command line arguments.
 * @param argv The command line arguments.
 * @returns The file path argument or null if none was found.
 */
export function getFilePathArgument(argv?: string[] | null): string | null {
    if (!argv) {
        return null;
    }

    let index = (platform() === "darwin") ? 2 : 2;
    while (index < argv.length && argv[index].startsWith('--')) {
        index += 1;
    }

    return index < argv.length ? argv[index] : null;
}

export function executeAsync(command: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(stderr);
                reject(error);
            }

            console.log(stdout);
            resolve();
        });
    });
}
