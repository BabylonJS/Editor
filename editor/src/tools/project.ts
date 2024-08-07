export type ProjectType = {
    /**
     * Defines the base64 encoded preview of the project.
     */
    preview?: string;

    /**
     * Defines the absolute path on the hard drive of the project.
     */
    absolutePath: string;

    createdAt: Date;
    updatedAt: Date;
};

export const projectsKey: string = "babylonjs-editor-dashboard-projects";
