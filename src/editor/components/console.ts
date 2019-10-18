import { Tools as BabylonTools } from 'babylonjs';

import Editor from '../editor';

import ThemeSwitcher from '../tools/theme';

import CodeEditor from '../gui/code';
import Layout from '../gui/layout';
import Toolbar from '../gui/toolbar';

export enum ConsoleLevel {
    /**
     * Just log an info.
     */
    INFO = 0,
    /**
     * Just log a warning.
     */
    WARN,
    /**
     * Just log an error.
     */
    ERROR
}

interface LogMessage {
    message: string;
    level: ConsoleLevel;
}

export default class EditorConsole {
    /**
     * The layout used to draw toolbar etc.
     */
    public layout: Layout;
    /**
     * The toolbar reference.
     */
    public toolbar: Toolbar;
    /**
     * The code editor reference used to draw the logs.
     */
    public code: CodeEditor;

    private _messages: LogMessage[] = [];

    /**
     * Defines the maximum number of logs available in the console.
     */
    public static MaxLogsCount: number = 1000;

    /**
     * Constructor.
     * @param editor the editor reference.
     */
    constructor (protected editor: Editor) {
        // Layout
        this.layout = new Layout('CONSOLE');
        this.layout.panels = [
            { type: 'top', size: 30, content: '<div id="CONSOLE-TOOLBAR" style="width: 100%; height: 100%;"></div>', resizable: false },
            { type: 'main', content: '<div id="CONSOLE-EDITOR" style="width: 100%; height: 100%"></div>' }
        ];
        this.layout.build('CONSOLE');

        // Toolbar
        this.toolbar = new Toolbar('CONSOLE-TOOLBAR');
        this.toolbar.items = [
            { type: 'button', id: 'clear', text: 'clear', img: 'icon-recycle' }
        ];
        this.toolbar.onClick = id => this._onToolbarClick(id);
        this.toolbar.build('CONSOLE-TOOLBAR');

        // Set language
        window['monaco'].languages.register({ id: 'consoleLanguage' });
        window['monaco'].languages.setMonarchTokensProvider('consoleLanguage', {
            tokenizer: {
                root: [
                    [/\[error.*/, "log-error"],
                    [/\[warn.*/, "log-notice"],
                    [/\[info.*/, "log-info"],
                    [/\[[a-zA-Z 0-9:]+\]/, "log-date"],
                ]
            }
        });

        window['monaco'].editor.defineTheme('consoleTheme', {
            base: ThemeSwitcher.ThemeName === 'Dark' ? 'vs-dark' : 'vs',
            inherit: false,
            rules: [
                { token: 'log-info', foreground: '808080' },
                { token: 'log-error', foreground: 'ff0000', fontStyle: 'bold' },
                { token: 'log-warn', foreground: 'FFA500' },
                { token: 'log-date', foreground: '008800' },
            ]
        });

        window['monaco'].languages.registerCompletionItemProvider('consoleLanguage', {
            provideCompletionItems: () => []
        });

        // Code Editor
        this.code = new CodeEditor('consoleLanguage', '');
        this.code.theme = 'consoleTheme';
        this.code.build('CONSOLE-EDITOR');

        // Events
        BabylonTools.Log = (m) => {
            console.log(m);
            this.log(m, ConsoleLevel.INFO);
        };
    }

    /**
     * Logs a new message in the console.
     * @param message the message to log.
     * @param level the level of the given logged message.
     */
    public log (message: string, level: ConsoleLevel): void {
        const date = new Date(Date.now());
        const dateStr = `${date.toLocaleDateString()} - ${date.toLocaleTimeString()}`;

        switch (level) {
            case ConsoleLevel.INFO:
                this._messages.push({ message: `[${dateStr}] [info] ${message}`, level: level });
                break;
            case ConsoleLevel.WARN:
                this._messages.push({ message: `[${dateStr}] [warn] ${message}`, level: level });
                break;
            case ConsoleLevel.ERROR:
                this._messages.push({ message: `[${dateStr}] [error] ${message}`, level: level });
                break;
        }

        // Check limit
        if (this._messages.length > EditorConsole.MaxLogsCount)
            this._messages.shift();

        this.code.setValue(this._messages.map(m => m.message).join('\n'));
    }

    /**
     * Clears the console.
     */
    public clear (): void {
        this.code.setValue('');
        this._messages = [];
    }

    // On the user clicks on the toolbar.
    private _onToolbarClick (id: string): void {
        switch (id) {
            case 'clear':
                this.clear();
                break;
        }
    }
}