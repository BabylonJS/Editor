export interface IObjectModified<T> {
    /**
     * Defines the reference to the object that has been modified.
     */
    object: T;
    /**
     * Defines the path as a string of the modified property.
     * @example "position.x"
     * @example "name"
     */
    path: string;
}
