declare namespace W2UI {
    export interface IW2Confirm {
        yes (callback: () => void): this;
        no (callback: () => void): this;
    }
}

declare var w2confirm: {
    (body: string, title: string, callback: (result: string) => void): W2UI.IW2Confirm;
}

export default class Dialog {
    /**
     * Creates a GUI dialog window
     * @param title the title of the window
     * @param body the body of the window
     * @param callback the dialog's callback
     * @param yes callback when user clicks "yes"
     * @param no callback when the user clicks "no"
     */
    public static Create (title: string, body: string, callback: (result: string) => void, yes?: () => void, no?: () => void): void {
        w2confirm(body, title, (result) => callback(result))
            .yes(() => yes && yes())
            .no(() => no && no());
    }
}
