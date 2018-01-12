import * as fs from 'fs-extra';
import * as path from 'path';

import * as Koa from 'koa';
import * as KoaRouter from 'koa-router';

export default class StorageRouter {
    // Public members
    public router: KoaRouter;
    public application: Koa;

    // Protected members
    protected path: string = '';

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
            this.path = (ctx.query && ctx.query.path) ? ctx.query.path : process.cwd();
            const entries = await fs.readdir(this.path);
            const files: { name: string, folder: string }[] = [{ name: '..', folder: path.join(this.path, '..') }];

            for (const e of entries) {
                const stat = await fs.stat(path.resolve(this.path, e));
                files.push({ name: e, folder: stat.isDirectory() ? path.resolve(this.path, e) : null });
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
            if (!ctx.query || !ctx.query.name || !ctx.query.folder)
                throw new Error('Please provide a folder to wirte file in.');
            
            const chunks = [];
            ctx.req.on('data', (chunk) => {
                chunks.push(chunk);
            });
            ctx.req.on('end', async () => {
                const buffer = Buffer.concat(chunks);

                // Write file
                await fs.writeFile(path.join(ctx.query.folder, ctx.query.name), buffer);
            });

            ctx.body = {
                message: 'success'
            };
        });
    }

    /**
     * Creates a folder
     */
    protected createFolder (): void {
        this.router.post('/files:/folder', async (ctx, next) => {
            const chunks = [];
            ctx.req.on('data', (chunk) => {
                chunks.push(chunk);
            });
            ctx.req.on('end', async () => {
                const buffer = Buffer.concat(chunks);
                const folder = buffer.toString().split('=')[1]; // name={{the-name}}

                // Write file
                const filename = path.resolve(this.path, folder);

                if (!(await fs.pathExists(filename)))
                    await fs.mkdir(filename);
            });

            ctx.body = {
                message: 'success'
            };
        });
    }
}
