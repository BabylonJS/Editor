import Window from './window';
import Form from './form';

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
     * @deprecated
     */
    public static Create (title: string, body: string, callback?: (result: string) => void, yes?: () => void, no?: () => void): Promise<string> {
        return new Promise<string>((resolve) => {
            w2confirm(body, title, (result) => {
                resolve(result);
                callback && callback(result);
            })
            .yes(() => yes && yes())
            .no(() => no && no());
        });
    }

    /**
     * Creates a GUI confirm window (yes, no).
     * @param title the title of the dialog window.
     * @param body the body of the dialog window (HTML).
     */
    public static async CreateConfirm (title: string, body: string): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            w2confirm(body, title, null)
                .yes(() => resolve(true))
                .no(() => resolve(false));
        });
    }

    /**
     * Creates a GUI dialog with a text input.
     * @param title the title of the dialog.
     * @param value optional value to automatically set in the text input.
     * @param password if the input is a password.
     */
    public static CreateWithTextInput (title: string, value?: string, password?: boolean): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            // Window
            const popin = new Window('AskName');
            popin.title = title;
            popin.body = `<div id="ASK-NAME-CREATE-DIALOG" style="width: 100%; height: 100%"></div>`;
            popin.buttons = ['Ok'];
            popin.showClose = false;
            popin.showMax = false;
            popin.width = 500;
            popin.height = 160;
            await popin.open();

            // Form
            const form = new Form('ASK-NAME-CREATE-DIALOG');
            form.fields.push({ name: 'Name', required: true, type: password ? 'password' : 'text', options: {  } });
            form.onChange = () => popin.onButtonClick('Ok');
            form.build('ASK-NAME-CREATE-DIALOG');

            if (value !== undefined) {
                form.element.record['Name'] = value;
                form.element.refresh();
            }

            // Events
            popin.onClose = () => {
                form.element.destroy();
                reject('User decided to not give an input');
            };

            popin.onButtonClick = id => {
                if (!form.isValid())
                    return;

                resolve(form.element.record['Name']);

                // Close
                popin.close();
            };
        });
    }
}
