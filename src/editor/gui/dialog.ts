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
     */
    public static Create (title: string, body: string, callback: (result: string) => void, yes?: () => void, no?: () => void): void {
        w2confirm(body, title, (result) => callback(result))
            .yes(() => yes && yes())
            .no(() => no && no());
    }

    /**
     * Creates a GUI dialog with a text input
     * @param title the title of the dialog
     */
    public static CreateWithTextInput (title: string): Promise<string> {
        return new Promise<string>((resolve) => {
            // Window
            const popin = new Window('AskName');
            popin.title = title;
            popin.body = `<div id="ASK-NAME-CREATE-DIALOG" style="width: 100%; height: 100%"></div>`;
            popin.buttons = ['Ok'];
            popin.showClose = false;
            popin.showMax = false;
            popin.width = 500;
            popin.height = 160;
            popin.open();

            // Form
            const form = new Form('ASK-NAME-CREATE-DIALOG');
            form.fields.push({ name: 'Name', required: true, type: 'text', options: {  } });
            form.onChange = () => popin.onButtonClick('Ok');
            form.build('ASK-NAME-CREATE-DIALOG');

            // Events
            popin.onButtonClick = id => {
                if (!form.isValid())
                    return;

                resolve(form.element.record['Name']);

                // Destroy
                form.element.destroy();
                popin.close();
            };
        });
    }
}
