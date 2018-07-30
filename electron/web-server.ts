import { networkInterfaces } from 'os';

import * as Koa from 'koa';
import * as KoaBodyParser from 'koa-bodyparser';
import * as KoaStatic from 'koa-static';

import StorageRouter from './routes/storage';
import ToolsRouter from './routes/tools';

export default class WebServer {
    // Public members
    public application: Koa;
    
    /**
     * Constructor
     * @param port: the port
     */
    constructor (port: number) {
        this.application = new Koa();
        this.application.proxy = true;
        
        this.application.use(KoaBodyParser({
            formLimit: '200mb',
            jsonLimit: '200mb'
        }));

        this.application.use(KoaStatic('.'));

        new StorageRouter(this.application);
        new ToolsRouter(this.application);
    }

    /**
     * Listen to the given port
     * @param port the port to listen
     */
    public listen (port: number, address?: string): void {
        if (address) {
            this.application.listen(port, address);
            return;
        }

        const interfaces = networkInterfaces();
        for (const i in interfaces) {
            for (const j of interfaces[i]) {
                if (!j.internal && j.family === 'IPv4') {
                    this.application.listen(port, j.address);
                    return;
                }
            }
        }
    }
}