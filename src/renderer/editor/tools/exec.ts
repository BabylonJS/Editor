import * as os from "os";
import { spawn, IPty } from "node-pty";

import { Editor } from "../editor";

export interface IExecProcess {
    /**
     * Defines the reference to the child process.
     */
    process: IPty;
    /**
     * Defines the reference to the promise resolve/rejected on the program exists.
     */
    promise: Promise<void>;
}

export class ExecTools {
    /**
     * Executes the given command at the given working directory.
     * @param editor the editor reference (used to write output in console).
     * @param command the command to execute.
     * @param cwd the working directory while executing the command.
     * @param noLogs defines wether or not the command's outputs should be listened and drawn in the editor's console.
     */
    public static Exec(editor: Editor, command: string, cwd?: string, noLogs?: boolean): Promise<void> {
        return this.ExecAndGetProgram(editor, command, cwd, noLogs).promise;
    }

    /**
     * Executes the given command at the given working directory and returns the program/promise pair.
     * @param editor the editor reference (used to write output in console).
     * @param command the command to execute.
     * @param cwd the working directory while executing the command.
     * @param noLogs defines wether or not the command's outputs should be listened and drawn in the editor's console.
     */
    public static ExecAndGetProgram(editor: Editor, command: string, cwd?: string, noLogs?: boolean): IExecProcess {
        const shell = editor.getPreferences().terminalPath ?? process.env[os.platform() === "win32" ? "COMSPEC" : "SHELL"];
        if (!shell) {
            const message = `Can't execute command "${command}" as no shell environment is available.`;
            editor.console.logError(message);
            throw new Error(message);
        }

        const args: string[] = [];
        const platform = os.platform();
        if (platform === "darwin") {
            args.push("-l");
        }

        const program = spawn(shell, args, { cwd });

        if (!noLogs) {
            program.onData((e) => {
                editor.console.logRaw(e);
            });
        }

        const promise = new Promise<void>((resolve, reject) => {
            program.onExit((e) => {
                if (e?.exitCode === 0) { return resolve(); }
                reject();
            });
        });

        program.write(`${command.replace(/\\/g, "/")}\n\r`);
        program.write("exit\n\r");

        return { process: program, promise };
    }
}
