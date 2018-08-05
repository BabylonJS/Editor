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
    protected configs: IStringDictionary<ComponentConfig> = { };

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
        // Update config
        this.configs[config.componentName] = config;

        // Add container
        try {
            const component = this.element.getComponent(config.componentName);
            const container = this.containers[config.componentName];

            if (container)
                return this._configureContainer(container, config);
        }
        catch (e) {
            // Does not exists, create it
            this._registerComponents([config]);
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
        this.panels.forEach(p => this._registerComponents(<ComponentConfig[]> p.content));

        // Initialize
        this.element.init();

        System.import('./node_modules/golden-layout/src/css/goldenlayout-base.css');
        System.import('./node_modules/golden-layout/src/css/goldenlayout-dark-theme.css');
    }

    // Registers all components
    private _registerComponents (content: ComponentConfig[]): void {
        if (!content)
            return;

        content.forEach(c => {
            if (c.type === 'component') {
                this.element.registerComponent(c.componentName, (container: GoldenLayout.Container) => {
                    // Register panel
                    this.containers[c.componentName] = container;
                    
                    // Configure
                    this._configureContainer(container, c);
                });
            }

            this._registerComponents(<GoldenLayout.ComponentConfig[]> c.content);
        });
    }

    // Configure the given container with the given config
    private _configureContainer (container: GoldenLayout.Container, lastConfig: ComponentConfig): void { 
        const config = this.configs[lastConfig.componentName] || lastConfig;

        // Add html
        if (config.html)
            container.getElement().append(typeof config.html === 'function' ? config.html() : config.html);

        // Resize
        container.on('resize', () => this.onPanelResize && this.onPanelResize());

        // Destroy
        container.on('destroy', () => config.onClose && config.onClose());

        // Click
        let firstShow = true;
        container.on('show', () => {
            // If first show, that means the tab has just been created
            if (firstShow)
                return (firstShow = false);
            
            config.onClick && config.onClick();

            // Hack hack hack, makes resize working better for canvas
            setTimeout(() => window.dispatchEvent(new Event('resize')), 0);
        });
    }
}
