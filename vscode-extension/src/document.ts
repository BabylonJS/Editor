import { TextDocumentContentProvider, EventEmitter, Uri } from 'vscode';
import Sockets from './socket';

export default class CustomTextDocument implements TextDocumentContentProvider {
    // Public members
    public readonly onDidChangeEmitter = new EventEmitter<Uri>();
    public readonly onDidChange = this.onDidChangeEmitter.event;

    /**
     * Provides the text to draw to the editor
     * @param uri the uri containing the text
     */
    public provideTextDocumentContent(uri: Uri): string {
        const s = Sockets.codeScripts.find(cs => cs.name === uri.path);
        if (s) return s.code;
        
        return uri.path;
    }
}
