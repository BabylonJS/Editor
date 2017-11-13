import { IAnimatable, Animation, Animatable, Color3, Scalar } from 'babylonjs';
import * as Raphael from 'raphael';

import Editor from '../../editor/editor';
import Tools from '../../editor/tools/tools';

import { IStringDictionary } from '../../editor/typings/typings';
import { EditorPlugin } from '../../editor/typings/plugin';

import Layout from '../../editor/gui/layout';
import Toolbar from '../../editor/gui/toolbar';
import List from '../../editor/gui/list';

export interface DragData {
    point: RaphaelElement;
    line: RaphaelPath;
    keyIndex: number;
    maxFrame: number;
    properties: string[];
    property: string;
    valueInterval: number;
}

export default class AnimationEditor extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public toolbar: Toolbar = null;

    public fpsInput: JQuery = null;

    public paper: RaphaelPaper = null;
    public background: RaphaelElement = null;
    public middleLine: RaphaelElement = null;
    public noDataText: RaphaelElement = null;
    public valueText: RaphaelElement = null;

    public lines: RaphaelPath[] = [];
    public points: RaphaelElement[] = [];

    public timeline: RaphaelElement = null;
    public timelineLines: RaphaelElement[] = [];
    public timelineTexts: RaphaelElement[] = [];

    public cursorRect: RaphaelElement = null;
    public cursorLine: RaphaelElement = null;

    public animatable: IAnimatable = null;
    public animation: Animation = null;
    public animationManager: Animatable = null;

    // Protected members
    protected mouseMoveHandler: (ev: MouseEvent) => void;
    protected addingKeys: boolean = false;

    protected onResize = () => this.resize();
    protected onObjectSelected = (node) => this.objectSelected(node);

    // Static members
    public static PaperOffset: number = 30;

    public static Colors: Color3[] = [
        new Color3(255, 0, 0),
        new Color3(0, 255, 0),
        new Color3(0, 0, 255),
        new Color3(0, 0, 0)
    ];

    private static _Properties: IStringDictionary<string[]> = {
        'number': [''],
        'Number': [''],
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
    constructor(public editor: Editor) {
        super('Animation Editor');
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Create layout
        this.layout = new Layout('AnimationEditorLayout');
        this.layout.panels = [
            { type: 'top', content: '<div id="ANIMATION-EDITOR-TOOLBAR" style="width: 100%; height: 100%;"></div>', size: AnimationEditor.PaperOffset, resizable: false },
            { type: 'main', content: '<div id="ANIMATION-EDITOR-PAPER" style="width: 100%; height: 100%;"></div>', resizable: false }
        ]
        this.layout.build('AnimationEditor');

        // Create toolbar
        this.toolbar = new Toolbar('AnimationEditorToolbar');
        this.toolbar.items = [
            { type: 'check', id: 'add', text: 'Add', img: 'icon-add', checked: false },
            { type: 'break' },
            { type: 'menu', id: 'animations', text: 'Animations', img: 'icon-folder', items: [] },
            { type: 'spacer' },
            {
                type: 'html',
                id: 'fps',
                html: `
                    <div style="padding: 3px 10px;">    
                        FPS: <input size="10" id="ANIMATION-EDITOR-FPS" style="height: 20px; padding: 3px; border-radius: 2px; border: 1px solid silver"/>
                    </div>`
            }
        ];
        this.toolbar.onClick = (id) => this.onToolbarClick(id);
        this.toolbar.build('ANIMATION-EDITOR-TOOLBAR');

        // Create paper
        this.paper = Raphael($('#ANIMATION-EDITOR-PAPER')[0], 0, 0);

        // Create background
        this.background = this.paper.rect(0, 0, 0, 0);
        this.background.attr('fill', '#ddd');
        this.background.attr('stroke', '#ddd');

        // Create middle line
        this.middleLine = this.paper.rect(0, 0, 0, 1);
        this.middleLine.attr('fill', '#eee');
        this.middleLine.attr('stroke', '#eee');

        // No data text
        this.noDataText = this.paper.text(0, 0, 'No Animation Selected');
        this.noDataText.attr('font-size', 64);

        // Value text
        this.valueText = this.paper.text(0, 0, '0.0');
        this.valueText.attr('font-size', 10);
        this.valueText.hide();

        // Events
        const input = $('#ANIMATION-EDITOR-FPS');
        this.fpsInput = (<any> input).w2field('int', { autoFormat: true });
        this.fpsInput[0].addEventListener('change', (ev) => {
            debugger;
        });

        // Resize
        this.editor.core.onResize.add(this.onResize);

        // On select object
        this.objectSelected(this.editor.core.currentSelectedObject);
        this.editor.core.onSelectObject.add(this.onObjectSelected);
    }

    /**
     * Closes the plugin
     */
    public async close(): Promise<void> {
        super.close();
        
        this.editor.core.onResize.removeCallback(this.onResize);
        this.editor.core.onSelectObject.removeCallback(this.onObjectSelected);

        this.paper.remove();
        this.layout.element.destroy();
        this.toolbar.element.destroy();

        await super.close();
    }

    /**
     * Resizes the panel
     */
    protected resize(): void {
        this.layout.element.resize();

        const size = this.layout.getPanelSize('main');
        this.paper.setSize(size.width, size.height);

        this.background.attr('width', size.width);
        this.background.attr('height', size.height);

        this.middleLine.attr('width', size.width);
        this.middleLine.attr('y', size.height / 2);

        this.noDataText.attr('y', size.height / 2 - this.noDataText.attr('height') / 2);
        this.noDataText.attr('x', size.width / 2 - this.noDataText.attr('width') / 2);

        this.updateGraph(this.animation);
    }

    /**
     * On the user clicked on the toolbar
     * @param id the id of the element
     */
    protected onToolbarClick(id: string): void {
        const split = id.split(':');
        if (split.length > 1 && split[0] === 'animations') {
            this.onChangeAnimation(split[1]);
            return;
        }

        switch (id) {
            case 'add': this.addingKeys = !this.addingKeys; break;
            default: break;
        }
    }

    /**
     * On select an object
     * @param object: the IAnimatable object
     */
    protected objectSelected(object: IAnimatable): void {
        if (!object.animations)
            return;

        // Misc.
        this.editor.core.scene.stopAnimation(object);

        // Update animations list
        const animations = ['None'];
        object.animations.forEach(a => {
            animations.push(a.name);
        });

        const menu = <any>this.toolbar.element.get('animations');
        menu.items = [];
        animations.forEach(a => {
            menu.items.push({
                id: a,
                caption: a,
                text: a
            });
        });
        this.toolbar.element.refresh();

        // Misc.
        this.animatable = object;

        if (object.animations.length > 0) {
            this.onChangeAnimation(object.animations[0].name);
        } else {
            this.updateGraph(null);
            this.noDataText.show();
        }
    }

    /**
     * On the animation selection changed
     * @param property: the animation property
     */
    protected onChangeAnimation(property: string): void {
        if (!this.animatable)
            return;

        // Show "no data" text
        this.noDataText.show();
        
        // Misc.
        this.animation = this.animatable.animations.find(a => a.name === property);
        if (!this.animation)
            return this.updateGraph(this.animation);

        // Hide "no data" text
        this.noDataText.hide();

        const keys = this.animation.getKeys();
        const maxFrame = keys[keys.length - 1].frame;

        if (this.animationManager)
            this.animationManager.stop();

        this.animationManager = new Animatable(this.editor.core.scene, this.animatable, keys[0].frame, maxFrame, false, 1.0);
        this.animationManager.appendAnimations(this.animatable, this.animatable.animations);

        // Update graph
        this.updateGraph(this.animation);

        // Update FPS
        this.fpsInput.val(this.animation.framePerSecond.toString());
    }

    /**
     * Updates the graph
     * @param anim: the animation reference
     */
    protected updateGraph(anim: Animation): void {
        // Remove all lines
        this.lines.forEach(l => l.remove());
        this.points.forEach(p => p.remove());
        this.timelineLines.forEach(tl => tl.remove());
        this.timelineTexts.forEach(t => t.remove());

        this.lines = [];
        this.points = [];
        this.timelineLines = [];
        this.timelineTexts = [];

        if (this.cursorRect)
            this.cursorRect.remove();

        if (this.cursorLine)
            this.cursorLine.remove();

        if (this.timeline)
            this.timeline.remove();

        // Return if no anim
        if (!anim)
            return;

        // Keys
        const keys = anim.getKeys();

        if (keys.length === 0)
            return;

        // Values
        const properties = AnimationEditor._Properties[Tools.GetConstructorName(keys[0].value)];
        const maxFrame = keys[keys.length - 1].frame;
        const middle = this.paper.height / 2;

        let maxValue = 0;
        let minValue = 0;

        // Max value
        properties.forEach((p, propertyIndex) => {
            keys.forEach(k => {
                if (p === '') {
                    if (k.value > maxValue)
                        maxValue = k.value;
                    else if (k.value < minValue)
                        minValue = k.value;

                    return;
                }

                if (k.value[p] > maxValue)
                    maxValue = k.value[p];
                else if (k.value[p] < minValue)
                    minValue = k.value[p];
            });
        });

        const valueInterval = Math.max(Math.abs(maxValue), Math.abs(minValue));

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
        linesCount = 50;
        let currentValue = maxValue * 2;

        for (let i = 0; i < linesCount; i++) {
            // Line
            const y = (this.paper.height / linesCount) * i;

            const line = this.paper.rect(0, y, 20, 1);
            line.attr('opacity', 0.05);

            if (i % 5 === 0) {
                if (i > 0) {
                    const text = this.paper.text(30, y, currentValue.toFixed(2));
                    text.attr('opacity', 0.4);
                    this.timelineTexts.push(text);
                }

                currentValue -= (maxValue / (linesCount / 10)) * 2;
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

        // Manage paper move
        this.onPaperMove(properties, maxFrame, valueInterval, keys);

        // Add all lines
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
                    y += ((value * middle) / (valueInterval * (value > 0 ? 1 : -1)) * (value > 0 ? -1 : 1)) / 2;

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
                    properties: properties,
                    maxFrame: maxFrame,
                    valueInterval: valueInterval
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
    protected onMovePoint(data: DragData): void {
        let ox = 0;
        let oy = 0;

        let lx = 0;
        let ly = 0;

        const onStart = (x: number, y: number, ev) => {
            data.point.attr('opacity', 1);
            this.valueText.show();
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

            // Update current animation key (frame + value)
            const frame = Scalar.Clamp((ev.offsetX * data.maxFrame) / this.paper.width, 0, data.maxFrame - 1);

            let value = 0;
            if (ev.offsetY > this.paper.height / 2)
                value = -((ev.offsetY - this.paper.height / 2) * data.valueInterval) / (this.paper.height / 2) * 2;
            else
                value = ((this.paper.height / 2 - ev.offsetY) * data.valueInterval) / (this.paper.height / 2) * 2;

            const keys = this.animation.getKeys();
            keys[data.keyIndex].frame = frame;

            if (data.property === '')
                keys[data.keyIndex].value = value;
            else {
                data.properties.forEach(p => {
                    const key = keys[data.keyIndex];
                    if (p === data.property)
                        key.value[p] = value;
                });
            }

            // Update value text
            this.valueText.attr('x', ev.offsetX);
            this.valueText.attr('y', ev.offsetY - 20);
            this.valueText.attr('text', value.toFixed(4));
        };

        const onEnd = (ev) => {
            data.point.attr('opacity', 0.3);
            ox = lx;
            oy = ly;

            this.valueText.hide();
            this.updateGraph(this.animation);
        };

        data.point.drag(<any>onMove, <any>onStart, <any>onEnd);
    }

    /**
     * On moving cursor
     */
    protected onMoveCursor(maxFrame: number): void {
        const baseX = this.cursorLine.attr('x');

        let ox = 0;
        let lx = 0;

        const doAnimatables = (animatables: IAnimatable[], frame: number) => {
            animatables.forEach(a => {
                if (a === this.animatable)
                    return;
                
                let animatable = this.editor.core.scene.getAnimatableByTarget(a);
                if (!animatable)
                    animatable = new Animatable(this.editor.core.scene, a, frame, maxFrame, false, 1.0);
                
                animatable.appendAnimations(a, a.animations);
                animatable.stop();
                animatable.goToFrame(frame);
            });
        };

        const onStart = (x: number, y: number, ev: MouseEvent) => {
            this.cursorRect.attr('opacity', 0.1);
        };

        const onMove = (dx: number, dy: number, x: number, y: number, ev: MouseEvent) => {
            lx = dx + ox;
            this.cursorRect.transform(`t${lx},0`);
            this.cursorLine.transform(`t${lx},0`);

            const frame = Scalar.Clamp(((lx + baseX) * maxFrame) / this.paper.width, 0, maxFrame - 1);

            this.animationManager.stop();
            this.animationManager.goToFrame(frame);

            doAnimatables(this.editor.core.scene.meshes, frame);
            doAnimatables(this.editor.core.scene.cameras, frame);
            doAnimatables(this.editor.core.scene.lights, frame);
            doAnimatables(<any> this.editor.core.scene.particleSystems, frame);
        };

        const onEnd = (ev: MouseEvent) => {
            this.cursorRect.attr('opacity', 0.5);
            ox = lx;
        };

        this.cursorRect.drag(<any>onMove, <any>onStart, <any>onEnd);
    }

    /**
     * On click on the timeline
     */
    protected onClickTimeline(maxFrame: number): void {
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
    protected onPaperMove(properties: string[], maxFrame: number, valueInterval: number, keys: any[]): void {
        this.background.unmousemove(this.mouseMoveHandler);

        const points: RaphaelElement[] = [];

        this.mouseMoveHandler = (ev: MouseEvent) => {
            this.lines.forEach((l, index) => {
                if (!this.addingKeys) {
                    points[index].hide();
                    return;
                }

                points[index].show();

                const length = l.getTotalLength();
                const position = l.getPointAtLength((ev.offsetX * length) / this.paper.width);
                const offset = length / this.paper.width;

                const point = points[index];
                point.transform(`t${position.x},${position.y}`);
            });
        };

        properties.forEach((_, index) => {
            const color = AnimationEditor.Colors[index];

            const circle = this.paper.circle(0, 0, 6);
            circle.attr('fill', Raphael.rgb(color.r, color.g, color.b));
            circle.click((ev: MouseEvent) => {
                const frame = Scalar.Clamp((ev.offsetX * maxFrame) / this.paper.width, 0, maxFrame - 1);

                let value = 0;
                if (ev.offsetY > this.paper.height / 2)
                    value = -((ev.offsetY - this.paper.height / 2) * valueInterval) / (this.paper.height / 2) * 2;
                else
                    value = ((this.paper.height / 2 - ev.offsetY) * valueInterval) / (this.paper.height / 2) * 2;

                // Add key
                if (properties.length === 1) {
                    let key = {
                        frame: frame,
                        value: value
                    };

                    for (let i = 0; i < keys.length; i++) {
                        if (keys[i].frame > frame) {
                            keys.splice(i, 0, key);
                            break;
                        }
                    }

                    this.updateGraph(this.animation);
                }
            });

            points.push(circle);
            this.points.push(circle);
        })

        this.background.mousemove(this.mouseMoveHandler);
    }
}
