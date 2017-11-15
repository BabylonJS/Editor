import * as Koa from 'koa';

import StorageRouter from './routes/storage';

export default class WebServer {
    // Public members
    public application: Koa;
    
    /**
     * Constructor
     * @param port: the port
     */
    constructor (port: number) {
        this.application = new Koa();
        this.application.listen(port);

        new StorageRouter(this.application);
    }
}