import Window from './window';

export interface PickerItem {
    name?: string | null;
    id?: string | null;
}

export default class Picker {
    // Public members
    public items: string[] = [];
    public popup: W2UI.W2Popup = null;

    public title: string;

    /**
     * Constructor
     */
    constructor (title: string) {
        this.title = title;
    }

    /**
     * Adds the given items to pick
     * @param items: items to add
     */
    public addItems (items: PickerItem[]): void {
        items.forEach(i => this.items.push(i.name || i.id));
    }

    /**
     * Builds the object picker
     * @param callback: called when user clicks the button "ok"
     */
    public open (callback: (items: string[]) => void): void {
        const window = new Window('Picker');
        window.buttons = ['Ok', 'Close'];
        window.title = this.title;
        window.body = '<div id="PICKER-CONTAINER" style="width: 100%; height: 100%;"></div>';
        window.onButtonClick = (id) => id === 'Close' && window.close();
        window.open();

        // Create grid
        // TODO
    }
}
