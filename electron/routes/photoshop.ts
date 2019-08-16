import * as KoaRouter from 'koa-router';

import Settings from '../settings/settings';
import WebServer from '../web-server';

import * as GeneratorCore from 'generator-core/lib/generator';
import * as GeneratorLogging from 'generator-core/lib/logging';
import * as GeneratorConfig from 'generator-core/lib/config';

export default class PhotoshopRouter {
    // Public members
    public router: KoaRouter;
    public webServer: WebServer;

    private _generatorProcess: any = null;

    /**
     * Constructor
     * @param application: the KOA application
     */
    constructor (webServer: WebServer) {
        this.webServer = webServer;
        this.router = new KoaRouter();

        // Create routes
        this.hasProcess();
        this.closeProcess();
        this.createProcess();

        webServer.localApplication.use(this.router.routes());
    }

    /**
     * Returns wether or not the photoshop process is done.
     */
    protected hasProcess (): void {
        this.router.get('/photoshop/hasProcess', async (ctx, next) => {
            ctx.body = this._generatorProcess !== null;
        });
    }

    /**
     * Closes the photoshop process.
     */
    protected closeProcess (): void {
        this.router.get('/photoshop/closeProcess', async (ctx, next) => {
            if (!this._generatorProcess)
                return (ctx.body = false);

            this._generatorProcess.shutdown();
            ctx.body = true;
        });
    }

    /**
     * Creates the photoshop process.
     */
    protected createProcess (): void {
        this.router.get('/photoshop/createProcess', async (ctx, next) => {
            // Logger
            const loggerManager = new GeneratorLogging.LoggerManager(GeneratorLogging.LOG_LEVEL_INFO);

            // Generator
            this._generatorProcess = GeneratorCore.createGenerator(loggerManager);
            this._generatorProcess.on("close", function () {
                setTimeout(() => {
                    this._generatorProcess = null;
                }, 1000);
            });

            // Start
            try {
                await this._generatorProcess.start({
                    config: GeneratorConfig.getConfig()
                });

                this._generatorProcess.loadPlugin(`${Settings.ProcessDirectory}/photoshop-extension`);

                ctx.body = true;
            } catch (e) {
                ctx.body = false;
            }
        });
    }
}
