// Type definitions for Microsoft Live Connect v5.0
// Project: http://msdn.microsoft.com/en-us/library/live/hh243643.aspx
// Definitions by: John Vilk <https://github.com/jvilk/>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare module OneDrive {
    interface IFolder {
        childCount: number;
    }

    interface IFile {
        mimeType: string;
    }

    interface IParentReference {
        id: string;
        path: string;
    }

    interface IChildResult {
        size: number;
        id: string;
        name: string;
        parentReference: IParentReference;
        folder?: IFolder;
        file?: IFile;
    }

    interface IChildrenResult {
        value: IChildResult[];
    }
}
