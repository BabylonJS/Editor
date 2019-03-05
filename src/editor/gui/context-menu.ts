import { IStringDictionary } from '../typings/typings';

export interface ContextMenuItem {
    name: string;
    callback?: (itemId?: string) => void;
}

export default class ContextMenu {
    // Public members
    public static Items: IStringDictionary<ContextMenuItem> = { };
    public static OnItemClicked: (itemId?: string) => void;

    /**
     * Inits the context menu
     */
    public static async Init (): Promise<void> {
        await System.import('node_modules/jquery-contextmenu/dist/jquery.contextMenu.js');
        await System.import('node_modules/jquery-contextmenu/dist/jquery.ui.position.js');
        await System.import('node_modules/jquery-contextmenu/dist/jquery.contextMenu.min.css');

        (<any> $).contextMenu({
            selector: '.ctxmenu',
            trigger: 'none',
            build: ($trigger, e) => {
                e.preventDefault();

                return {
                    callback: (key) => {
                        this.Items[key].callback(key);
                        this.OnItemClicked && this.OnItemClicked(key);
                    },
                    items: this.Items
                }
            }
        });
    }

    /**
     * Configures the given element .oncontextmenu event
     * @param element the element to configure
     * @param items the items to draw once
     */
    public static ConfigureElement (element: HTMLElement, items: IStringDictionary<ContextMenuItem>): void {
        element.addEventListener('contextmenu', (ev) => {
            this.Items = items;
            this.Show(ev);
        });
    }

    /**
     * Shows the context menu
     * @param mouseEvent the mouse event that fires the context menu
     * @param items the items to show on the user wants to show the context menu
     */
    public static Show (mouseEvent: MouseEvent, items?: IStringDictionary<ContextMenuItem>): void {
        if (items)
            this.Items = items;
        
        (<any> $(mouseEvent.target)).contextMenu({ x: mouseEvent.x, y: mouseEvent.y });
    }
}
