"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const path = require("path");
const KoaRouter = require("koa-router");
class StorageRouter {
    /**
     * Constructor
     * @param application: the KOA application
     */
    constructor(application) {
        // Protected members
        this.path = '';
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
    getFiles() {
        this.router.get('/files', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            this.path = (ctx.query && ctx.query.path) ? ctx.query.path : process.cwd();
            const entries = yield fs.readdir(this.path);
            const files = [{ name: '..', folder: path.join(this.path, '..') }];
            for (const e of entries) {
                const stat = yield fs.stat(path.resolve(this.path, e));
                files.push({ name: e, folder: stat.isDirectory() ? path.resolve(this.path, e) : null });
            }
            ctx.body = {
                value: files
            };
        }));
    }
    /**
     * Writes the given file
     */
    writeFile() {
        this.router.put('/files:/write', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            if (!ctx.query || !ctx.query.name || !ctx.query.folder)
                throw new Error('Please provide a folder to wirte file in.');
            const chunks = [];
            ctx.req.on('data', (chunk) => {
                chunks.push(chunk);
            });
            ctx.req.on('end', () => __awaiter(this, void 0, void 0, function* () {
                const buffer = Buffer.concat(chunks);
                // Write file
                yield fs.writeFile(path.join(ctx.query.folder, ctx.query.name), buffer);
            }));
            ctx.body = {
                message: 'success'
            };
        }));
    }
    /**
     * Creates a folder
     */
    createFolder() {
        this.router.post('/files:/folder', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            const chunks = [];
            ctx.req.on('data', (chunk) => {
                chunks.push(chunk);
            });
            ctx.req.on('end', () => __awaiter(this, void 0, void 0, function* () {
                const buffer = Buffer.concat(chunks);
                const folder = buffer.toString().split('=')[1]; // name={{the-name}}
                // Write file
                const filename = path.resolve(this.path, folder);
                if (!(yield fs.pathExists(filename)))
                    yield fs.mkdir(filename);
            }));
            ctx.body = {
                message: 'success'
            };
        }));
    }
}
exports.default = StorageRouter;
//# sourceMappingURL=storage.js.map