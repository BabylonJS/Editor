import { dialog } from 'electron';

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
        this.setWorkingDirectory();
        this.writeFile();
        this.readFile();
        this.createFolder();
        this.getPaths();
        
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
     * Set the working directory
     */
    protected setWorkingDirectory (): void {
        this.router.post('/files:/workingDirectory', async (ctx, next) => {
            this.path = ctx.request.body.name;
            
            ctx.body = {
                message: 'success'
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
            
            await fs.writeFile(path.join(ctx.query.folder, ctx.query.name), ctx.request.rawBody);

            ctx.body = {
                message: 'success'
            };
        });
    }

    /**
     * Get file content
     */
    protected readFile (): void {
        this.router.get('/files:/read', async (ctx, next) => {
            const filename = ctx.query.path;
            
            ctx.type = path.extname(filename);
            ctx.body = fs.createReadStream(filename);
        });
    }

    /**
     * Creates a folder
     */
    protected createFolder (): void {
        this.router.post('/files:/folder', async (ctx, next) => {
            const folder = ctx.request.body.name;
            const filename = path.resolve(this.path, folder);

            if (!(await fs.pathExists(filename)))
                await fs.mkdir(filename);

            ctx.body = {
                message: 'success'
            };
        });
    }

    /**
     * Get a path
     */
    protected getPaths (): void {
        this.router.get('/files:/paths', async (ctx, next) => {
            const paths = await new Promise<string[]>((resolve, reject) => {
                dialog.showOpenDialog({
                    title: ctx.query && ctx.query.title ? ctx.query.title : undefined,
                    defaultPath: ctx.query && ctx.query.folder ? ctx.query.folder : undefined,
                    properties: [ctx.query && ctx.query.type || 'openDirectory']
                }, paths => resolve(paths));
            });

            ctx.body = paths;
        });
    }
}
