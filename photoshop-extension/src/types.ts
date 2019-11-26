/**
 * Augmentation of generator-core.
 */
export interface IGenerator {
    onPhotoshopEvent (eventName: string, callback: () => void): void,
    evaluateJSXString<T> (id: string): Promise<T>,
    getDocumentPixmap (id: number, settings: any): Promise<{ pixels: number[]; width: number; height: number; channelCount: number; }>;
    getDocumentInfo (id: number): Promise<{ file: string; }>;
    getOpenDocumentIDs (): Promise<number[]>;
};

declare module 'socket.io' {
    interface Server {
        once (event: string, listener: Function): SocketIO.Namespace;
    }
}
