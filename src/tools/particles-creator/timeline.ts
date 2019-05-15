import * as Raphael from 'raphael';
import { ParticleSystemSet, ParticleSystem, Observer } from 'babylonjs';
import { ContextMenu } from 'babylonjs-editor';

import ParticlesCreator from './index';

export default class Timeline {
    // Public members
    public paper: RaphaelPaper;
    public background: RaphaelElement;
    public timeBackground: RaphaelElement;
    public timeLines: RaphaelElement[] = [];
    public playLine: RaphaelElement;

    public separators: RaphaelElement[] = [];
    public systems: RaphaelElement[] = [];
    public names: RaphaelElement[] = [];
    public times: RaphaelElement[] = [];

    // Private members
    private _maxX: number = 0;
    private _set: ParticleSystemSet = null;
    private _modifyingObjectObserver: Observer<any>;
    private _modifiedObjectObserver: Observer<any>;

    // Static members
    private static _Scale: number = 100;

    /**
     * Constructor
     * @param root the root element where to draw the timeline
     */
    constructor (public creator: ParticlesCreator, root: HTMLDivElement) {
        // Create paper
        this.paper = Raphael(root, 0, 0);

        // Create background
        this.background = this.paper.rect(0, 0, 1, 1);
        this.background.attr('fill', '#aaa');
        this.background.attr('stroke', '#aaa');
        this._onMoveBackground();

        // Create time background
        this.timeBackground = this.paper.rect(0, 0, 1, 25);
        this.timeBackground.attr('fill', '#777');
        this.timeBackground.attr('stroke', '#777');

        // Play line
        this.playLine = this.paper.rect(0, 0, 1, 1);
        this.playLine.attr('fill', '#999');
        this.playLine.attr('stroke', '#999');

        // Events
        this._bindEvents();
    }

    /**
     * Disposes the timeline
     */
    public dispose (): void {
        this.creator.editor.core.onModifyingObject.remove(this._modifyingObjectObserver);
        this.creator.editor.core.onModifiedObject.remove(this._modifiedObjectObserver);

        this.paper.remove();
    }

    /**
     * Resizes the timeline
     * @param width the new width of the timeline
     * @param height the new height of the timeline
     */
    public resize (width: number, height: number): void {
        this.paper.setSize(width, height);

        this.background.attr('width', width);
        this.background.attr('height', height);

        this.timeBackground.attr('width', width);

        this.playLine.attr('height', height);

        this.setSet(this._set);
    }

    /**
     * Sets the current particle systems set
     * @param set the new set to draw
     */
    public setSet (set: ParticleSystemSet): void {
        if (!set)
            return;
        
        this._set = set;

        // Destroy all
        this.systems.forEach(s => s.remove());
        this.systems = [];

        this.separators.forEach(s => s.remove());
        this.separators = [];

        this.names.forEach(n => n.remove());
        this.names = [];

        this.times.forEach(t => t.remove());
        this.times = [];

        this.timeLines.forEach(t => t.remove());
        this.timeLines = [];

        // Add systems
        set.systems.forEach((s, i) => {
            const index = i + 1;

            // Create new system element
            const system = this.paper.rect(0, 40 * index + 1, 100, 35, 16);
            system.attr('fill', '#ddd');
            system.attr('stroke-width', 0);
            system.attr('x', (s.startDelay / 1000 * Timeline._Scale));
            system.data('bx', system.attr('x'));
            this.systems.push(system);

            // Name
            const name = this.paper.text(0, 0, s.name);
            name.attr('x', system.attr('x') +  system.attr('width') / 2 - name.attr('width') / 2);
            name.attr('y', system.attr('y') + system.attr('height') / 2 - name.attr('height') / 2 - 10);
            name.data('bx', name.attr('x'));
            name.node.style.pointerEvents = 'none';
            this.names.push(name);

            // Time
            const time = this.paper.text(0, 0, s.startDelay + ' (ms)');
            time.attr('x', system.attr('x') +  system.attr('width') / 2 - time.attr('width') / 2);
            time.attr('y', system.attr('y') + system.attr('height') / 2 - time.attr('height') / 2 + 10);
            time.data('bx', name.attr('x'));
            time.node.style.pointerEvents = 'none';
            this.times.push(time);

            // Create line
            const separator = this.paper.rect(0, 40 * (index + 1) - 2.5, this.paper.width, 1);
            separator.attr('fill', '#666');
            separator.attr('stroke', '#666');
            this.separators.push(separator);

            // Events
            this._onMoveSystem(<ParticleSystem> s, system, name, time);
            this._onShowSystemContextMenu(<ParticleSystem> s, system);

            if (system.attr('x') > this._maxX)
                this._maxX = system.attr('x') + system.attr('width');
        });

        // Add timelines
        const steps = 5;
        const diff = Timeline._Scale / steps;
        const end = (this._maxX / diff) * 2;

        for (let i = 0; i < end; i++) {
            const isSecond = i % steps === 0;

            const line = this.paper.rect(i * diff, 0, 1, isSecond ? this.paper.height : (this.timeBackground.attr('height') - 15));
            line.attr('fill', '#999');
            line.attr('stroke-width', 0);
            line.data('bx', line.attr('x'));
            this.timeLines.push(line);

            if (isSecond) {
                const text = this.paper.text(0, 20, ((i / steps) >> 0) + ' (s)');
                text.attr('x', i * diff + 5 + text.attr('width'));
                text.data('bx', text.attr('x'));
                text.node.style.pointerEvents = 'none';
                this.timeLines.push(text);
            }
        }

        // Play
        this.playLine.transform('t0,0');
        this.playLine.attr('x', 0);
        this.playLine.animate({ transform: `t${this._maxX},0` }, (this._maxX * 1000) / Timeline._Scale);
        this.playLine.toFront();

        // Systems are front
        this.systems.forEach(s => s.toFront());
        this.names.forEach(n => n.toFront());
        this.times.forEach(t => t.toFront());
    }

    // Performs a drag'n'drop animation for the background
    private _onMoveBackground (): void {
        let ox = 0;
        let lx = 0;
        let all: RaphaelElement[] = [];

        const onStart = ((x: number, y: number, ev: DragEvent) => {
            all = this._getAllMovableElements();
        });

        const onMove = ((dx: number, dy: number, x: number, y: number, ev: DragEvent) => {
            lx = dx + ox;

            all.forEach(a => {
                a.attr('x', (a.data('bx') || 0) + lx);
            });
        });

        const onEnd = ((ev) => {
            ox = lx;
        });

        this.background.drag(<any> onMove, <any> onStart, <any> onEnd);
    }

    // Performs a drag'n'drop animation for systems
    private _onMoveSystem (system: ParticleSystem, s: RaphaelElement, n: RaphaelElement, t: RaphaelElement): void {
        const bx = s.attr('x');
        let ox = 0;
        let lx = 0;

        const onStart = ((x: number, y: number, ev: DragEvent) => {
            s.attr('opacity', 0.3);

            // Stroke width
            this.systems.forEach(s => s.attr('stroke-width', 0));
            s.attr('stroke-width', 2);

            // Notify
            this.creator.editor.core.onSelectObject.notifyObservers(system);
        });

        const onMove = ((dx: number, dy: number, x: number, y: number, ev: DragEvent) => {
            const ms = ((bx + (dx + ox)) / Timeline._Scale * 1000) >> 0;
            if (ms < 0) {
                return;
            }

            lx = dx + ox;

            s.transform(`t${lx},0`);
            n.transform(`t${lx},0`);
            t.transform(`t${lx},0`);

            t.attr('text', ms + ' (ms)');
        });

        const onEnd = ((ev) => {
            ox = lx;
            system.startDelay = ((bx + ox) / Timeline._Scale * 1000) >> 0;

            // Update system
            s.attr('opacity', 1);
            s.data('sd', system.startDelay);

            // Update tools
            if (this.creator.editor.edition.currentObject === system)
                this.creator.editor.edition.updateDisplay();
        });

        s.drag(<any> onMove, <any> onStart, <any> onEnd);
    }

    // Performs a context menu on the user right-clicks on the system
    private _onShowSystemContextMenu (system: ParticleSystem, s: RaphaelElement): void {
        s.node.classList.add('ctxmenu');
        s.node.addEventListener('contextmenu', (ev: MouseEvent) => {
            ContextMenu.Show(ev, {
                remove: { name: 'Remove', callback: () => this.creator.removeSystemFromSet(system) }
            });
        });
    }

    // Binds the needed events
    private _bindEvents (): void {
        this._modifyingObjectObserver = this.creator.editor.core.onModifyingObject.add((o: ParticleSystem) => {
            if (!this._set)
                return;
            
            const index = this._set.systems.indexOf(o);
            if (index !== -1) {
                const s = this.systems[index];
                const n = this.names[index];
                const t = this.times[index];
                const diff = (o.startDelay - s.data('sd')) / 1000 * Timeline._Scale;

                s.transform(`t${diff},0`);
                n.transform(`t${diff},0`);
                t.transform(`t${diff},0`);
            }
        });
        this._modifiedObjectObserver = this.creator.editor.core.onModifiedObject.add((o: ParticleSystem) => {
            if (!this._set)
                return;
        
            const index = this._set.systems.indexOf(o);
            if (index !== -1)
                this.setSet(this._set);
        });
    }

    // Returns all movable elements of the paper
    private _getAllMovableElements (): RaphaelElement[] {
        const result: RaphaelElement[] = [];
        let bot = this.paper.bottom;
        while (bot) {
            if (
                bot === this.background || bot === this.timeBackground || this.separators.indexOf(bot) !== -1) {
                bot = bot.next;
                continue;
            }

            result.push(bot);
            bot = bot.next;
        }

        return result;
    }
}
