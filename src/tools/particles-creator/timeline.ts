import * as Raphael from 'raphael';
import { ParticleSystemSet, ParticleSystem, Observer } from 'babylonjs';

import ParticlesCreator from './index';

export default class Timeline {
    // Public members
    public paper: RaphaelPaper;
    public background: RaphaelElement;
    public timeBackground: RaphaelElement;
    public timeLines: RaphaelElement[] = [];
    public timeMs: RaphaelElement;

    public separators: RaphaelElement[] = [];
    public systems: RaphaelElement[] = [];
    public names: RaphaelElement[] = [];

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

        // Time helper
        this.timeMs = this.paper.text(0, 0, 'N/A');
        this.timeMs.hide();

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

            // Test
            const text = this.paper.text(0, 0, s.name);
            text.attr('x', system.attr('x') +  system.attr('width') / 2 - text.attr('width') / 2);
            text.attr('y', system.attr('y') + system.attr('height') / 2 - text.attr('height') / 2);
            text.data('bx', text.attr('x'));
            text.node.style.pointerEvents = 'none';
            this.names.push(text);

            // Create line
            const separator = this.paper.rect(0, 40 * (index + 1) - 2.5, this.paper.width, 1);
            separator.attr('fill', '#666');
            separator.attr('stroke', '#666');
            this.separators.push(separator);

            // Events
            this._onMoveSystem(<ParticleSystem> s, system, text);

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
                const text = this.paper.text(0, 20, ((i / steps) >> 0).toString());
                text.attr('x', i * diff + 5 + text.attr('width'));
                text.data('bx', text.attr('x'));
                text.node.style.pointerEvents = 'none';
                this.timeLines.push(text);
            }
        }

        // Systems are front
        this.systems.forEach(s => s.toFront());
        this.names.forEach(n => n.toFront());
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
    private _onMoveSystem (system: ParticleSystem, s: RaphaelElement, t: RaphaelElement): void {
        const bx = s.attr('x');
        let ox = 0;
        let lx = 0;

        const onStart = ((x: number, y: number, ev: DragEvent) => {
            s.attr('opacity', 0.3);
            this.timeMs.show();

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
            t.transform(`t${lx},0`);

            this.timeMs.attr('x', s.attr('x') + lx);
            this.timeMs.attr('y', s.attr('y') - 10);
            this.timeMs.attr('text', ms);
        });

        const onEnd = ((ev) => {
            ox = lx;

            system.startDelay = ((bx + ox) / Timeline._Scale * 1000) >> 0;

            s.attr('opacity', 1);
            s.data('sd', system.startDelay);

            this.timeMs.hide();

            // Update tools
            if (this.creator.editor.edition.currentObject === system)
                this.creator.editor.edition.updateDisplay();
        });

        s.drag(<any> onMove, <any> onStart, <any> onEnd);
    }

    // Binds the needed events
    private _bindEvents (): void {
        this._modifyingObjectObserver = this.creator.editor.core.onModifyingObject.add((o: ParticleSystem) => {
            if (!this._set)
                return;
            
            const index = this._set.systems.indexOf(o);
            if (index !== -1) {
                const s = this.systems[index];
                const t = this.names[index];
                const diff = (o.startDelay - s.data('sd')) / 1000 * Timeline._Scale;
                s.transform(`t${diff},0`);
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
