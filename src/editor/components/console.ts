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

interface Filters {
    [ConsoleLevel.INFO]: boolean;
    [ConsoleLevel.WARN]: boolean;
    [ConsoleLevel.ERROR]: boolean;
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
    private _autoScroll: boolean = true;
    private _addingLog: boolean = false;

    private _filters: Filters = {
        [ConsoleLevel.INFO]: true,
        [ConsoleLevel.WARN]: true,
        [ConsoleLevel.ERROR]: true
    };

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
            { type: 'button', id: 'clear', text: 'clear', img: 'icon-recycle' },
            { type: 'break' },
            { type: 'button', id: 'informations', text: 'informations', checked: true },
            { type: 'button', id: 'warnings', text: 'warnings', checked: true },
            { type: 'button', id: 'errors', text: 'errors', checked: true }
        ];
        this.toolbar.onClick = id => this._onToolbarClick(id);
        this.toolbar.build('CONSOLE-TOOLBAR');

        // Code Editor
        this._createEditor();

        // Events
        BabylonTools.Log = ((m) => {
            console.log(m);
            this.log(m, ConsoleLevel.INFO);
        });
    }

    /**
     * Logs a new message in the console.
     * @param message the message to log.
     * @param level the level of the given logged message.
     */
    public log (message: string, level: ConsoleLevel): void {
        const date = new Date(Date.now());
        const dateStr = `${date.toLocaleDateString()} - ${date.toLocaleTimeString()}`;

        let log: LogMessage;
        switch (level) {
            case ConsoleLevel.INFO:
                log = { message: `[${dateStr}] [info] ${message}`, level: level };
                break;
            case ConsoleLevel.WARN:
                log = { message: `[${dateStr}] [warn] ${message}`, level: level };
                break;
            case ConsoleLevel.ERROR:
                log = { message: `[${dateStr}] [error] ${message}`, level: level };
                break;
        }

        // Add message
        this._messages.push(log);

        // Check limit
        if (this._messages.length > EditorConsole.MaxLogsCount)
            this._messages.shift();

        // Check filter
        if (!this._filters[log.level])
            return;

        // Add!
        this._addingLog = true;
        this.code.setValue(this.code.getValue() + (this._messages.length > 1 ? '\n' : '') + this._messages[this._messages.length - 1].message);
        if (this._autoScroll)
            this.code.editor.revealLine(this.code.editor.getModel().getLineCount());
        this._addingLog = false;
    }

    /**
     * Clears the console.
     */
    public clear (): void {
        this.code.setValue('');
        this._messages = [];
    }

    // Creates the code editor.
    private async _createEditor (): Promise<void> {
        this.code = new CodeEditor('log', '');
        await this.code.build('CONSOLE-EDITOR');

        // Events
        this.code.editor.onDidScrollChange((e) => {
            const topForLastLine = this.code.editor.getTopForLineNumber(this._messages.length);
            if (e.scrollTop >= topForLastLine)
                this._autoScroll = true;
            else if (e.scrollTopChanged && !this._addingLog)
                this._autoScroll = false;
        });
    }

    // On the user clicks on the toolbar.
    private _onToolbarClick (id: string): void {
        switch (id) {
            case 'clear':
                this.clear();
                break;
            case 'informations':
            case 'warnings':
            case 'errors':
                const isChecked = this.toolbar.isChecked(id, true);
                switch (id) {
                    case 'informations': this._filters[ConsoleLevel.INFO] = isChecked; break;
                    case 'warnings': this._filters[ConsoleLevel.WARN] = isChecked; break;
                    case 'errors': this._filters[ConsoleLevel.ERROR] = isChecked; break;
                }
                this.toolbar.setChecked(id, isChecked);

                this._filtersChanged();
                break;
        }
    }

    // Called on the filters changed.
    private _filtersChanged (): void {
        const messages = this._messages.filter(m => {
            if (!this._filters[m.level])
                return false;

            return true;
        });

        this._addingLog = true;
        this.code.setValue(messages.map(m => m.message).join('\n'));
        if (this._autoScroll)
            this.code.editor.revealLine(this.code.editor.getModel().getLineCount());
        this._addingLog = false;
    }
}