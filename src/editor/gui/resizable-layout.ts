import * as GoldenLayout from 'golden-layout';

import { IStringDictionary } from '../typings/typings';

export type ComponentConfig = GoldenLayout.ComponentConfig & {
    html?: HTMLElement | string | (() => HTMLElement);
    onClose?: () => void;
    onClick?: () => void;
}

export type ItemConfigType = GoldenLayout.ItemConfig | ComponentConfig;

export default class ResizableLayout {
    // Public element
    public element: GoldenLayout = null;

    public name: string;
    public panels: ItemConfigType[] = [];

    public showCloseIcon: boolean = false;

    public onPanelResize: () => void;

    // Protected members
    protected containers: IStringDictionary<GoldenLayout.Container> = { };

    /**
     * Constructor
     * @param name the resizable layout name
     */
    constructor (name: string) {
        this.name = name;
    }

    /**
     * Returns the size of the given panel
     * @param type: the component name
     */
    public getPanelSize (name: string): { width: number; height: number; } {
        const panel = this.containers[name];
        return {
            width: panel.width,
            height: panel.height
        };
    }

    /**
     * Sets the given panel size
     * @param name the panel's name
     * @param value the new size of the panel
     */
    public setPanelSize (name: string, value: number): void {
        const item = this.element.root.getItemsById(name)[0];
        if (item) {
            item.config.height = value;
            this.element.updateSize();
        }
    }

    /**
     * Shows the given tab
     * @param name the tab to show
     */
    public showPanelTab (name: string): void {
        const container = this.containers[name];
        if (!container || !container.parent)
            return;

        const tab = container.parent;
        const stack = tab.parent;

        if (!stack)
            return;

        try {
            stack.setActiveContentItem(tab);
        } catch (e) { /* Catch silently */ }
    }

    /**
     * Removes the given panel
     * @param name the name of the panel to remove
     */
    public removePanel (name: string): void {
        const container = this.containers[name];
        if (!container || !container.parent)
            return;

        container.off('show');
        container.off('resize');
        container.off('destroy');

        try {
            container.close();
        } catch (e) { /* Catch silently */ }

        delete this.containers[name];
    }

    /**
     * Adds a panel to the layout
     * @param stackId: the stack to add component in
     * @param config: the panel's configuration
     */
    public addPanelToStack (stackId: string, config: ComponentConfig): void {
        try {
            this.element.getComponent(config.componentName);
        }
        catch (e) {
            // Does not exists, create it
            this.registerComponents([config]);
        }

        // Add child in the stack
        this.element.root.getItemsById(stackId)[0].addChild(config);
    }

    /**
     * Builds the resizable layout
     * @param parentId the parent id
     */
    public build (parentId: string): void {
        this.element = new GoldenLayout({
            settings: {
                showPopoutIcon: false,
                showCloseIcon: this.showCloseIcon,
                showMaximiseIcon: true
            },
            dimensions: {
                minItemWidth: 240,
                minItemHeight: 180
            },
            labels: {
                close: 'Close',
                maximise: 'Maximize',
                minimise: 'Minimize'
            },
            content: this.panels
        }, $('#' + parentId));

        // Register components
        this.panels.forEach(p => this.registerComponents(<ComponentConfig[]> p.content));

        // Initialize
        this.element.init();

        System.import('./node_modules/golden-layout/src/css/goldenlayout-base.css');
        System.import('./node_modules/golden-layout/src/css/goldenlayout-light-theme.css');
    }

    // Registers all components
    private registerComponents (content: ComponentConfig[]): void {
        if (!content)
            return;

        content.forEach(c => {
            if (c.type === 'component') {
                this.element.registerComponent(c.componentName, (container: GoldenLayout.Container) => {
                    // Register panel
                    this.containers[c.componentName] = container;
                    
                    // Add html
                    if (c.html)
                        container.getElement().append(typeof c.html === 'function' ? c.html() : c.html);

                    // Resize
                    container.on('resize', () => this.onPanelResize && this.onPanelResize());

                    // Destroy
                    container.on('destroy', () => c.onClose && c.onClose());

                    // Click
                    let firstShow = true;
                    container.on('show', () => {
                        // If first show, that means the tab has just been created
                        if (firstShow)
                            return (firstShow = false);
                        
                        c.onClick && c.onClick();
                    });
                });
            }

            this.registerComponents(<GoldenLayout.ComponentConfig[]> c.content);
        });
    }
}
