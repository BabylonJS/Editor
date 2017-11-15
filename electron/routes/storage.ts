import * as Koa from 'koa';
import * as KoaRouter from 'koa-router';

export default class StorageRouter {
    // Public members
    public router: KoaRouter;
    public application: Koa;

    /**
     * Constructor
     * @param application: the KOA application
     */
    constructor (application: Koa) {
        this.application = application;
        this.router = new KoaRouter();

        // Create routes
        this.getFiles();
        this.application.use(this.router.routes());
    }

    /**
     * Returns the files
     */
    protected getFiles (): void {
        this.router.get('/files', async (next) => {
            next.body = {
                // TODO: add files
            }
        });
    }
}
