import * as fs from 'fs-extra';
import * as path from 'path';

import * as Koa from 'koa';
import * as KoaRouter from 'koa-router';

export default class StorageRouter {
    // Public members
    public router: KoaRouter;
    public application: Koa;

    // Protected members
    protected path: string = process.cwd();

    /**
     * Constructor
     * @param application: the KOA application
     */
    constructor (application: Koa) {
        this.application = application;
        this.router = new KoaRouter();

        // Create routes
        this.getFiles();
        this.writeFile();
        this.createFolder();
        
        this.application.use(this.router.routes());
    }

    /**
     * Returns the files
     */
    protected getFiles (): void {
        this.router.get('/files', async (ctx, next) => {
            this.path = path.resolve(this.path + '/' + ((ctx.query && ctx.query.path) ? ctx.query.path : ''));
            const entries = await fs.readdir(this.path);
            const files: { name: string, folder: string }[] = [{ name: '..', folder: '..' }];

            for (const e of entries) {
                const stat = await fs.stat(path.resolve(this.path, e));
                files.push({ name: e, folder: stat.isDirectory() ? e : null });
            }

            ctx.body = {
                value: files
            };
        });
    }

    /**
     * Writes the given file
     */
    protected writeFile (): void {
        this.router.put('/files:/write', async (ctx, next) => {
            const chunks = [];
            ctx.req.on('data', (chunk) => {
                chunks.push(chunk);
            });
            ctx.req.on('end', async () => {
                const buffer = Buffer.concat(chunks);

                // Write file
                const filename = path.resolve(this.path, (ctx.query && ctx.query.name) ? ctx.query.name : '');
                await fs.writeFile(filename, buffer);
            });
        });
    }

    /**
     * Creates a folder
     */
    protected createFolder (): void {
        this.router.post('/files:/folder', async (ctx, next) => {
            const folder = (ctx.body && ctx.body.name) ? ctx.body.name : '';
            await fs.mkdir(folder);
        });
    }
}
