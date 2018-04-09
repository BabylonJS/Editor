import * as GoldenLayout from 'golden-layout';
import '../../../../node_modules/golden-layout/src/css/goldenlayout-base.css';
import '../../../../node_modules/golden-layout/src/css/goldenlayout-light-theme.css';

declare module 'golden-layout' {
    export interface ComponentConfig {
        html?: string;
    }
}

export default class ResizableLayout {
    // Public element
    public element: GoldenLayout = null;

    public name: string;
    public panels: GoldenLayout.ItemConfig[] = [];

    public showCloseIcon: boolean = false;

    // Protected members
    

    /**
     * Constructor
     * @param name the resizable layout name
     */
    constructor (name: string) {
        this.name = name;
    }

    /**
     * Builds the resizable layout
     * @param parentId the parent id
     */
    public build (parentId: string): void {
        this.element = new GoldenLayout({
            settings: {
                showPopoutIcon: false,
                showCloseIcon: this.showCloseIcon
            },
            labels: {
                close: 'Close',
                maximise: 'Maximize',
                minimise: 'Minimize'
            },
            content: this.panels
        }, $('#' + parentId));

        // Register components
        this.panels.forEach(p => this.registerComponents(p.content));

        // Initialize
        this.element.init();
    }

    private registerComponents (content: GoldenLayout.ItemConfig[]): void {
        if (!content)
            return;

        content.forEach(c => {
            if (c.type === 'component') {
                this.element.registerComponent(c['componentName'], (container) => {
                    if (c['html'])
                     container.getElement().html(c['html']);
                });
            }

            this.registerComponents(c.content);
        });
    }
}
