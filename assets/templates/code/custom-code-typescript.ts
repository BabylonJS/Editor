import { Tools } from 'babylonjs';

export class MyClass {

    /**
     * Constructor
     */
    constructor () {

    }

    /**
     * Logs the given message
     * @param message the message to log
     */
    public log (message: string): void {
        Tools.Log(message);
    }
}
