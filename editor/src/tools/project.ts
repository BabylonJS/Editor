export type ProjectType = {
    /**
     * Defines the base64 encoded preview of the project.
     */
    preview?: string;

    /**
     * Defines the absolute path on the hard drive of the project.
     */
    absolutePath: string;

    /**
     * Defines the date when the project was created or imported in the dashboard.
     */
    createdAt: Date;
    /**
     * Defines the date when the project was updated (aka. saved).
     */
    updatedAt: Date;
};

export const projectsKey: string = "babylonjs-editor-dashboard-projects";
