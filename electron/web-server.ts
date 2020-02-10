import { networkInterfaces } from 'os';

import * as Koa from 'koa';
import * as KoaBodyParser from 'koa-bodyparser';
import * as KoaStatic from 'koa-static';

import StorageRouter from './routes/storage';
import ToolsRouter from './routes/tools';
import PhotoshopRouter from './routes/photoshop';

import VSCodeSocket from './vscode/socket';

export default class WebServer {
    // Public members
    public localApplication: Koa;

    // Static members
    public address: string = 'localhost';
    
    /**
     * Constructor
     * @param port: the port
     */
    constructor () {
        this.localApplication = new Koa();
        this.localApplication.proxy = true;

        // Body parser
        const koaBodyParser = KoaBodyParser({
            formLimit: '200mb',
            jsonLimit: '200mb'
        });
        this.localApplication.use(koaBodyParser);

        // Static
        const koaStatic = KoaStatic('.');
        this.localApplication.use(koaStatic);

        new StorageRouter(this.localApplication);
        new ToolsRouter(this);
        new VSCodeSocket(this);
        new PhotoshopRouter(this);
    }

    /**
     * Listen to the given port
     * @param port the port to listen
     */
    public listen (port: number): void {
        // Local
        this.localApplication.listen(port, 'localhost');
    }
}