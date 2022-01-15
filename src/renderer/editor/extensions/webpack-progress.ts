import { createServer, Socket } from "net";

import { Nullable } from "../../../shared/types";

import { Observable } from "babylonjs";

import { Editor } from "../editor";

export interface IWebpackProgressData {
    /**
     * Defines the percentage of the progress.
     */
    percentage: number;
    /**
     * Defines the message of the progress plugin.
     */
    message: string;
    /**
     * Defines wether or not the progress is done (100%).
     */
    done: boolean;
}

export class WebpackProgressExtension {
    private static _Initialized: boolean = false;
    private static _Task: Nullable<string> = null;
    private static _LastMessage: Nullable<string> = null;

    /**
     * Defines the reference to the observable used to notify observers that compilation progress has changed.
     */
    public static OnProgressChanged: Observable<number> = new Observable<number>();

    /**
     * Initializes the webpack progress extension.
     * @param editor defines the reference to the editor.
     */
    public static Initialize(editor: Editor): void {
        if (this._Initialized) { return; }

        try {
            createServer((socket) => this._OnGotSocket(socket, editor)).listen(6969, "localhost");
        } catch (e) {
            editor.console.logError("Failed to create notifications server for Webpack");
        }
    }

    /**
     * Called on the server's socket has been retrieved.
     */
    private static _OnGotSocket(socket: Socket, editor: Editor): void {
        socket.on("error", () => {
            // Do nothing for now.
        });

        socket.on("data", (d) => {
            let data: IWebpackProgressData;
            try {
                const split = d.toString().split("\n");
                split.pop();

                const str =  split.pop();
                data = JSON.parse(str!) as IWebpackProgressData;
            } catch (e) {
                return;
            }

            if (data.message && data.message !== this._LastMessage) {
                editor.console.logInfo(`[WEBPACK MESSAGE]: ${data.message}`);
                this._LastMessage = data.message;
            }

            if (!this._Task) {
                this._Task = editor.addTaskFeedback(0, "", -1);
            }

            editor.updateTaskFeedback(this._Task, data.percentage, `Compiling ${this._LastMessage ? `(${this._LastMessage})` : ""}: ${data.percentage >> 0}%`);
            this.OnProgressChanged.notifyObservers(data.percentage >> 0);

            if (data.done) {
                editor.closeTaskFeedback(this._Task, 1000);

                this._Task = null;
                this._LastMessage = null;
            }
        });
    }
}
