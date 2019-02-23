import { TextDocumentContentProvider, EventEmitter, Uri } from 'vscode';
export default class CustomTextDocument implements TextDocumentContentProvider {
    readonly onDidChangeEmitter: EventEmitter<Uri>;
    readonly onDidChange: import("vscode").Event<Uri>;
    /**
     * Provides the text to draw to the editor
     * @param uri the uri containing the text
     */
    provideTextDocumentContent(uri: Uri): string;
}
