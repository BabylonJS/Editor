import { exec, ChildProcess } from "child_process";

import { Editor } from "../editor";

export interface IExecProcess {
    /**
     * Defines the reference to the child process.
     */
    process: ChildProcess;
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
     */
    public static async Exec(editor: Editor, command: string, cwd: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const program = exec(command, { cwd }, (error) => {
                if (error) { return reject(); }

                resolve();
            });

            program.stdout?.on("data", (d) => editor.console.logInfo(d.toString()));
            program.stderr?.on("data", (d) => editor.console.logError(d.toString()));
        });
    }

    /**
     * Executes the given command at the given working directory and returns the program/promise pair.
     * @param editor the editor reference (used to write output in console).
     * @param command the command to execute.
     * @param cwd the working directory while executing the command.
     */
    public static ExecAndGetProgram(editor: Editor, command: string, cwd: string): IExecProcess {
        const program = exec(command, { cwd });

        program.stdout?.on("data", (d) => editor.console.logInfo(d.toString()));
        program.stderr?.on("data", (d) => editor.console.logError(d.toString()));

        const promise = new Promise<void>((resolve, reject) => {
            program.on("exit", () => resolve());
            program.on("error", () => reject());
        });

        return { process: program, promise };
    }
}
