import { IAnimatable, Animation, Color3 } from 'babylonjs';
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

    public list: List = null;

    public animatable: IAnimatable = null;
    public animation: Animation = null;

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
    }

    /**
     * On the animation selection changed
     * @param property: the animation property
     */
    protected onChangeAnimation (property: string): void {
        if (!this.animatable)
            return;

        this.animation = this.animatable.animations.find(a => a.name === property);
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

        // Keys
        const keys = anim.getKeys();
        
        if (keys.length === 0)
            return;

        // Add all lines
        const maxFrame = keys[keys.length - 1].frame;
        const middle = this.paper.height / 2;

        const properties = AnimationEditor._Properties[Tools.GetConstructorName(keys[0].value)];

        properties.forEach((p, propertyIndex) => {
            const color = AnimationEditor.Colors[propertyIndex];
            const path: string[] = [];

            // Build line and add it
            const line = this.paper.path();

            /*
            const lineFill = this.paper.path(path);
            lineFill.attr('fill', Raphael.rgb(color.r, color.g, color.b));
            lineFill.attr('opacity', 0.05);
            */

            //this.lines.push(lineFill);

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
}
