import { IAnimatable, Animation, Animatable, Color3, Scalar } from 'babylonjs';
import * as Raphael from 'raphael';

import Editor from '../../editor/editor';
import Tools from '../../editor/tools/tools';

import { IStringDictionary } from '../../editor/typings/typings';
import { EditorPlugin } from '../../editor/typings/plugin';

import List from '../../editor/gui/list';

export interface DragData {
    point: RaphaelElement;
    line: RaphaelPath;
    keyIndex: number;
    maxFrame: number;
    property: string;
}

export default class AnimationEditor extends EditorPlugin {
    // Public members
    public paper: RaphaelPaper = null;
    public background: RaphaelElement = null;
    public middleLine: RaphaelElement = null;

    public lines: RaphaelPath[] = [];
    public points: RaphaelElement[] = [];

    public timeline: RaphaelElement = null;
    public timelineLines: RaphaelElement[] = [];
    public timelineTexts: RaphaelElement[] = [];

    public cursorRect: RaphaelElement = null;
    public cursorLine: RaphaelElement = null;

    public list: List = null;

    public animatable: IAnimatable = null;
    public animation: Animation = null;
    public animationManager: Animatable = null;

    // Static members
    public static Colors: Color3[] = [
        new Color3(255, 0, 0),
        new Color3(0, 255, 0),
        new Color3(0, 0, 255),
        new Color3(0, 0, 0)
    ];

    private static _Properties: IStringDictionary<string[]> = {
        'number': [''],
        'Vector2': ['x', 'y'],
        'Vector3': ['x', 'y', 'z'],
        'Vector4': ['x', 'y', 'z', 'w'],
        'Quaternion': ['x', 'y', 'z', 'w'],
        'Color3': ['r', 'g', 'b'],
        'Color4': ['r', 'g', 'b', 'a']
    };

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor (public editor: Editor) {
        super('Animation Editor');
    }

    /**
     * Creates the plugin
     */
    public async create (): Promise<void> {
        this.paper = Raphael(this.divElement, 0, 0);

        // Resize
        this.editor.core.onResize.add(_ => this.onResize());
        
        // Create background
        this.background = this.paper.rect(0, 0, 0, 0);
        this.background.attr('fill', '#ddd');
        this.background.attr('stroke', '#ddd');

        // Create middle line
        this.middleLine = this.paper.rect(0, 0, 0, 1);
        this.middleLine.attr('fill', '#eee');
        this.middleLine.attr('stroke', '#eee');

        // Add combo box
        this.list = new List('Animations');
        this.list.items = ['None'];
        this.list.onChange = (id) => this.onChangeAnimation(id);
        this.list.build(this.divElement, 'position: absolute; top: 0px; right: 0px;');

        // On select object
        this.editor.core.onSelectObject.add(node => this.onObjectSelected(node));
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        super.close();
        this.paper.remove();
    }

    /**
     * Resizes the panel
     */
    protected onResize (): void {
        const size = this.editor.layout.getPanelSize('preview');
        this.paper.setSize(size.width, size.height);

        this.background.attr('width', size.width);
        this.background.attr('height', size.height);

        this.middleLine.attr('width', size.width);
        this.middleLine.attr('y', size.height / 2);

        this.updateGraph(this.animation);
    }

    /**
     * On select an object
     * @param object: the IAnimatable object
     */
    protected onObjectSelected (object: IAnimatable): void {
        if (!object.animations)
            return;
        
        const animations = ['None'];
        object.animations.forEach(a => {
            animations.push(a.name);    
        });
        this.list.setItems(animations);

        this.animatable = object;

        if (object.animations.length > 0) {
            this.list.setSelected(object.animations[0].name);
            this.onChangeAnimation(object.animations[0].name);
        }
    }

    /**
     * On the animation selection changed
     * @param property: the animation property
     */
    protected onChangeAnimation (property: string): void {
        if (!this.animatable)
            return;

        this.animation = this.animatable.animations.find(a => a.name === property);

        const keys = this.animation.getKeys();
        const maxFrame = keys[keys.length - 1].frame;

        if (this.animationManager)
            this.animationManager.stop();

        this.animationManager = new Animatable(this.editor.core.scene, this.animatable, keys[0].frame, maxFrame, false, 1.0);
        this.animationManager.appendAnimations(this.animatable, this.animatable.animations);

        this.updateGraph(this.animation);
    }

    /**
     * Updates the graph
     * @param anim: the animation reference
     */
    protected updateGraph (anim: Animation): void {
        if (!anim)
            return;
        
        // Remove all lines
        this.lines.forEach(l => l.remove());
        this.points.forEach(p => p.remove());
        this.timelineLines.forEach(tl => tl.remove());
        this.timelineTexts.forEach(t => t.remove());

        if (this.cursorRect)
            this.cursorRect.remove();

        if (this.cursorLine)
            this.cursorLine.remove();

        if (this.timeline)
            this.timeline.remove();

        // Keys
        const keys = anim.getKeys();
        
        if (keys.length === 0)
            return;

        // Values
        const maxFrame = keys[keys.length - 1].frame;
        const middle = this.paper.height / 2;

        // Add timeline lines
        let linesCount = 100;

        for (let i = 0; i < linesCount; i++) {
            // Line
            const x = (this.paper.width / linesCount) * i;
            
            const line = this.paper.rect(x, 0, 1, 20);
            line.attr('opacity', 0.05);

            if (i % 5 === 0 && i > 0) {
                line.attr('opacity', 1);

                // Text
                const text = this.paper.text(x, 30, (((x * maxFrame) / this.paper.width)).toFixed(2));
                text.attr('opacity', 0.4);
                this.timelineTexts.push(text);
            }

            // Add high lines
            const highLine = this.paper.rect(x, 20, 1, this.paper.height - 20);
            highLine.attr('opacity', 0.05);

            this.timelineLines.push(line);
            this.timelineLines.push(highLine);
        }

        // Add value lines
        linesCount = 25;
        for (let i = 0; i < linesCount; i++) {
            // Line
            const y = (this.paper.height / linesCount) * i;

            const line = this.paper.rect(0, y, 20, 1);
            line.attr('opacity', 0.05);

            if (i % 5 === 0 && i > 0) {
                const text = this.paper.text(30, y, (0).toFixed(2));
                text.attr('opacity', 0.4);
                this.timelineTexts.push(text);
            }

            this.timelineLines.push(line);
        }

        // Add timeline clickable rect
        this.timeline = this.paper.rect(0, 0, this.paper.width, 20);
        this.timeline.attr('fill', Raphael.rgb(0, 0, 0));
        this.timeline.attr('opacity', 0.2);
        this.onClickTimeline(maxFrame);

        // Add cursor
        this.cursorLine = this.paper.rect(0, 0, 1, this.paper.height);
        this.cursorLine.attr('opacity', 0.5);

        this.cursorRect = this.paper.rect(-20, 0, 40, 20);
        this.cursorRect.attr('fill', Raphael.rgb(0, 0, 0));
        this.cursorRect.attr('opacity', 0.5);
        this.onMoveCursor(maxFrame);

        // Add all lines
        const properties = AnimationEditor._Properties[Tools.GetConstructorName(keys[0].value)];
        
        properties.forEach((p, propertyIndex) => {
            const color = AnimationEditor.Colors[propertyIndex];
            const path: string[] = [];

            // Build line and add it
            const line = this.paper.path();

            // For each key
            keys.forEach((k, keyIndex) => {
                let x = (k.frame * this.paper.width) / maxFrame;
                let y = middle;

                const value = (p === '') ? k.value : k.value[p];

                if (value !== 0 && maxFrame !== 0)
                    y += (value * middle) / (maxFrame * (value > 0 ? 1 : -1)) * (value > 0 ? -1 : 1);

                if (isNaN(x)) x = 0;
                if (isNaN(y)) y = 0;

                const point = this.paper.circle(x, y, 6);
                point.attr('fill', Raphael.rgb(color.r, color.g, color.b));
                point.attr('opacity', 0.3);
                this.points.push(point);
                this.onMovePoint({
                    point: point,
                    keyIndex: keyIndex,
                    line: line,
                    property: p,
                    maxFrame: maxFrame
                });

                path.push(keyIndex === 0 ? "M" : "L");
                path.push(x.toString());
                path.push(y.toString());
            });

            // Set line
            line.attr('stroke', Raphael.rgb(color.r, color.g, color.b));
            line.attr('path', path);

            this.lines.push(line);
        });
    }

    /**
     * On the user moves a key
     * @param key: the key to move
     */
    protected onMovePoint (data: DragData): void {
        // TODO: update path
        let ox = 0;
        let oy = 0;

        let lx = 0;
        let ly = 0;

        const onStart = (x: number, y: number, ev) => {
            data.point.attr('opacity', 1);
        };

        const onMove = (dx, dy, x, y, ev) => {
            lx = dx + ox;
            ly = dy + oy;
            data.point.transform(`t${lx},${ly}`);

            // Update line path
            const path: string[][] = data.line.attr('path');
            const key = path[data.keyIndex];

            key[1] = data.point.attr('cx') + lx;
            key[2] = data.point.attr('cy') + ly;

            data.line.attr('path', path);
        };

        const onEnd = (ev) => {
            data.point.attr('opacity', 0.3);
            ox = lx;
            oy = ly;
        };

        data.point.drag(<any> onMove, <any> onStart, <any> onEnd);
    }

    /**
     * On moving cursor
     */
    protected onMoveCursor (maxFrame: number): void {
        const baseX = this.cursorLine.attr('x');

        let ox = 0;
        let lx = 0;

        const onStart = (x: number, y: number, ev) => {
            this.cursorRect.attr('opacity', 0.1);
        };

        const onMove = (dx, dy, x, y, ev) => {
            lx = dx + ox;
            this.cursorRect.transform(`t${lx},0`);
            this.cursorLine.transform(`t${lx},0`);

            const frame = Scalar.Clamp(((lx + baseX) * maxFrame) / this.paper.width, 0, maxFrame - 1);

            this.animationManager.stop();
            this.animationManager.goToFrame(frame);
        };

        const onEnd = (ev) => {
            this.cursorRect.attr('opacity', 0.5);
            ox = lx;
        };

        this.cursorRect.drag(<any> onMove, <any> onStart, <any> onEnd);
    }

    /**
     * On click on the timeline
     */
    protected onClickTimeline (maxFrame: number): void {
        this.timeline.click((ev: MouseEvent) => {
            const frame = Scalar.Clamp((ev.offsetX * maxFrame) / this.paper.width, 0, maxFrame - 1);

            this.animationManager.stop();
            this.animationManager.goToFrame(frame);

            // Update cursor
            this.cursorRect.undrag();
            this.cursorRect.transform('t0,0');
            this.cursorLine.transform('t0,0');

            this.cursorRect.attr('x', ev.offsetX - 20);
            this.cursorLine.attr('x', ev.offsetX);

            this.onMoveCursor(maxFrame);
        });
    }

    /**
     * On paper mouse move
     */
    protected onPaperMove (): void {
        // TODO
    }
}
