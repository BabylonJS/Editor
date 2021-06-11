export interface IPixMap {
    pixels: number[];
    width: number;
    height: number;
    channelCount: number;
}

export interface IGenerator {
    onPhotoshopEvent (eventName: string, callback: () => void): void,
    evaluateJSXString<T> (id: string): Promise<T>,
    getDocumentPixmap (id: number, settings: any): Promise<IPixMap>;
    getDocumentInfo (id: number): Promise<{ file: string; }>;
    getOpenDocumentIDs (): Promise<number[]>;
};
