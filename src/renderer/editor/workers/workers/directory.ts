import "../../../module";

import directoryTree, { DirectoryTree } from "directory-tree";

export default class DirectoryWorker {
    /**
     * Constructor.
     */
    public constructor() {
        // Nothing to do for now...
    }

    /**
     * Recursively collects the information of the directory located at the given path and returns its result object.
     * @param path defines the abolute path to the directory to gets its information and its children recursively.
     */
    public getDirectoryTree(path: string): DirectoryTree {
        return directoryTree(path);
    }
}
