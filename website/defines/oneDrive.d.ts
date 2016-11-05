
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
        name: string;
        size?: number;
        id?: string;
        parentReference?: IParentReference;
        folder?: IFolder;
        file?: IFile;
    }

    interface IChildrenResult {
        value: IChildResult[];
    }
}
