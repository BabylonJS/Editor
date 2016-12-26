
declare module DropBox {
    interface IFileList {
        cursor: string;
        entries: IChildResult[];
        has_more: boolean;
    }

    interface IChildResult {
        name: string;
        size?: number;
        id?: string;
        path_display: string;
    }
}
