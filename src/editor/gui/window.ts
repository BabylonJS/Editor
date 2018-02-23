// w2alert
declare var w2alert: (message: string, title?: string) => void;

export default class Window {
    // Public members
    public name: string;
    public element: W2UI.W2Popup = null;

    public title: string = '';
    public body: string = '';
    public buttons: string[] = [];

    public width: number = 800;
    public height: number = 600;

    public showMax: boolean = true;

    public onButtonClick: (id: string) => void;
    public onClose: () => void;

    /**
     * Constructor
     * @param name: the name of the window
     */
    constructor (name: string) {
        this.name = name;
    }

    /**
     * Closes the window
     */
    public close (): void {
        this.element.close();
    }

    /**
     * Locks the window
     * @param message: the message to draw
     */
    public lock (message: string): void {
        w2popup.lock(message, true);
    }

    /**
     * Unlocks the window
     */
    public unlock (): void {
        w2popup.unlock();
    }

    /**
     * Opens the window
     */
    public open (): void {
        const id = 'WindowButtons';

        let buttons = '';
        for (var i = 0; i < this.buttons.length; i++) {
            buttons += `<button class="w2ui-btn" id="${id + '-' + this.buttons[i]}">${this.buttons[i]}</button>\n`;
        }

        this.element = <any> w2popup.open({
            title: this.title,
            body: this.body,
            buttons: buttons,
            width: this.width,
            height: this.height,
            showClose: true,
            showMax: this.showMax,
            modal: true
        });

        // Bind events
        this.buttons.forEach(b => {
            const button = $(`#${id}-${b}`);
            button.click((ev) => this.onButtonClick && this.onButtonClick(ev.target.id.split('-')[1]));
        });

        // On close
        this.element.on('close', () => this.onClose && this.onClose());
    }

    /**
     * Opens a window alert
     * @param message: the message to show
     * @param title: the title of the window alert
     */
    public static CreateAlert (message: string, title: string = 'Notification'): void {
        w2alert(message, title);
    }
}