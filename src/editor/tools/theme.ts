import Tools from "./tools";

export type ThemeType = 'Light' | 'Dark';

export default class ThemeSwitcher {
    // Public members
    public static LightThemeUrls: string[] = [
        'node_modules/w2ui/w2ui.css',
        'node_modules/jstree/dist/themes/default/style.min.css',
        'node_modules/golden-layout/src/css/goldenlayout-light-theme.css',
        'css/dat.gui.css'
    ];

    public static DarkThemeUrls: string[] = [
        'node_modules/w2ui/w2ui-dark.css',
        'node_modules/jstree/dist/themes/default-dark/style.min.css',
        'node_modules/golden-layout/src/css/goldenlayout-dark-theme.css'
    ];

    // Private members
    private static _ThemeName: ThemeType = 'Light';

    /**
     * Returns the theme's name
     */
    public static get ThemeName (): ThemeType {
        return this._ThemeName;
    }

    public static set ThemeName (name: ThemeType) {
        this._ThemeName = name;

        switch (name) {
            case 'Light': this.Apply(this.LightThemeUrls); break;
            case 'Dark': this.Apply(this.DarkThemeUrls); break;
            default: break;
        }
    }

    /**
     * Applies the theme dynamically
     * @param url the url of the theme
     */
    public static async Apply (urls: string[]): Promise<void> {
        for (const url of urls)
            await Tools.ImportScript('./' + url);
        
        for (let i = 0; i < document.styleSheets.length; i++) {
            const s = document.styleSheets[i];
            const href = s.href;

            if (!href)
                continue;

            if (this._IsInPath(href, this.LightThemeUrls))
                s.disabled = this._ThemeName !== 'Light';
            
            if (this._IsInPath(href, this.DarkThemeUrls))
                s.disabled = this._ThemeName !== 'Dark';
        }
    }

    // Returns if the 
    private static _IsInPath (url: string, urls: string[]): boolean {
        if (urls.indexOf(url) !== -1)
            return true;

        for (const u of urls) {
            if (url.indexOf(u) !== -1)
                return true;
        }

        return false;
    }
}
