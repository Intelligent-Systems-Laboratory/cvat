// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';

import 'svg.draggable.js';
import 'svg.resize.js';
import 'svg.select.js';

import { CanvasController } from './canvasController';
import { Listener, Master } from './master';
import { DrawHandler, DrawHandlerImpl } from './drawHandler';
import { EditHandler, EditHandlerImpl } from './editHandler';
import { MergeHandler, MergeHandlerImpl } from './mergeHandler';
import { SplitHandler, SplitHandlerImpl } from './splitHandler';
import { GroupHandler, GroupHandlerImpl } from './groupHandler';
import { ZoomHandler, ZoomHandlerImpl } from './zoomHandler';
import { AutoborderHandler, AutoborderHandlerImpl } from './autoborderHandler';
import consts from './consts';
import {
    translateToSVG,
    translateFromSVG,
    pointsToNumberArray,
    parsePoints,
    displayShapeSize,
    scalarProduct,
    vectorLength,
    ShapeSizeElement,
    DrawnState,
} from './shared';
import {
    CanvasModel,
    Geometry,
    UpdateReasons,
    FrameZoom,
    ActiveElement,
    DrawData,
    MergeData,
    SplitData,
    GroupData,
    Mode,
    Size,
    Configuration,
} from './canvasModel';

import { Job, Task } from '../../../cvat-core/src/session';

export interface CanvasView {
    html(): HTMLDivElement;
}

export class CanvasViewImpl implements CanvasView, Listener {
    private loadingAnimation: SVGSVGElement;
    private text: SVGSVGElement;
    private adoptedText: SVG.Container;
    private background: HTMLCanvasElement;
    private bitmap: HTMLCanvasElement;
    private grid: SVGSVGElement;
    private content: SVGSVGElement;
    private adoptedContent: SVG.Container;
    private canvas: HTMLDivElement;
    private gridPath: SVGPathElement;
    private gridPattern: SVGPatternElement;
    private controller: CanvasController;
    private svgShapes: Record<number, SVG.Shape>;
    private svgTexts: Record<number, SVG.Text>;
    private drawnStates: Record<number, DrawnState>;
    private geometry: Geometry;
    private drawHandler: DrawHandler;
    private editHandler: EditHandler;
    private mergeHandler: MergeHandler;
    private splitHandler: SplitHandler;
    private groupHandler: GroupHandler;
    private zoomHandler: ZoomHandler;
    private autoborderHandler: AutoborderHandler;
    private activeElement: ActiveElement;
    private configuration: Configuration;
    private serviceFlags: {
        drawHidden: Record<number, boolean>;
    };

    // ISL BACKGROUND FILTER
    private backgroundOriginal: any;
    private backgroundNew: any;
    private lastShapeClicked: number;
    // ISL END

    // ISL LOCK ICON
    private lastShapeHighlighted: number;

    // ISL MAGNIFYING GLASS
    private magnifyingGlassContainer: SVGSVGElement;
    private magnifyingGlassForeignObject: SVGForeignObjectElement;
    private magnifyingGlassImage: HTMLCanvasElement;
    private circle: SVGCircleElement;
    private border: SVGCircleElement;
    private magnifyingGlassRadius: number;
    // ISL END

    // ISL MANUAL TRACKING
    public set trackingElement(value: any) {
        this.controller.trackingElement = value;
    }

    public get trackingElement(): any {
        return this.controller.trackingElement;
    }
    // ISL END

    // ISL FIXED ZOOM
    private fixedZoomSize: number;
    private fixedZoomMultiplier: number;
    // ISL END
    private set mode(value: Mode) {
        this.controller.mode = value;
    }

    private get mode(): Mode {
        return this.controller.mode;
    }

    private isServiceHidden(clientID: number): boolean {
        return this.serviceFlags.drawHidden[clientID] || false;
    }

    private setupServiceHidden(clientID: number, value: boolean): void {
        this.serviceFlags.drawHidden[clientID] = value;
        const shape = this.svgShapes[clientID];
        const text = this.svgTexts[clientID];
        const state = this.drawnStates[clientID];

        if (value) {
            if (shape) {
                (state.shapeType === 'points' ? shape.remember('_selectHandler').nested : shape)
                    .style('display', 'none');
            }

            if (text) {
                text.addClass('cvat_canvas_hidden');
            }
        } else {
            delete this.serviceFlags.drawHidden[clientID];

            if (state) {
                if (!state.outside && !state.hidden) {
                    if (shape) {
                        (state.shapeType === 'points' ? shape.remember('_selectHandler').nested : shape)
                            .style('display', '');
                    }

                    if (text) {
                        text.removeClass('cvat_canvas_hidden');
                        this.updateTextPosition(
                            text,
                            shape,
                        );
                    }
                }
            }
        }
    }

    private onDrawDone(data: object | null, duration: number, continueDraw?: boolean): void {
        const hiddenBecauseOfDraw = Object.keys(this.serviceFlags.drawHidden)
            .map((_clientID): number => +_clientID);
        if (hiddenBecauseOfDraw.length) {
            for (const hidden of hiddenBecauseOfDraw) {
                this.setupServiceHidden(hidden, false);
            }
        }

        if (data) {
            const { clientID, points } = data as any;
            if (typeof (clientID) === 'number') {
                const event: CustomEvent = new CustomEvent('canvas.canceled', {
                    bubbles: false,
                    cancelable: true,
                });

                this.canvas.dispatchEvent(event);

                const [state] = this.controller.objects
                    .filter((_state: any): boolean => (
                        _state.clientID === clientID
                    ));

                this.onEditDone(state, points);
                return;
            }

            const { zLayer } = this.controller;
            const event: CustomEvent = new CustomEvent('canvas.drawn', {
                bubbles: false,
                cancelable: true,
                detail: {
                    // eslint-disable-next-line new-cap
                    state: {
                        ...data,
                        zOrder: zLayer || 0,
                    },
                    continue: continueDraw,
                    duration,
                },
            });

            this.canvas.dispatchEvent(event);
        } else if (!continueDraw) {
            const event: CustomEvent = new CustomEvent('canvas.canceled', {
                bubbles: false,
                cancelable: true,
            });

            this.canvas.dispatchEvent(event);
        }

        if (!continueDraw) {
            this.mode = Mode.IDLE;
            this.controller.draw({
                enabled: false,
            });
        }
    }

    private onEditDone(state: any, points: number[]): void {
        if (state && points) {
            const event: CustomEvent = new CustomEvent('canvas.edited', {
                bubbles: false,
                cancelable: true,
                detail: {
                    state,
                    points,
                },
            });

            this.canvas.dispatchEvent(event);
        } else {
            const event: CustomEvent = new CustomEvent('canvas.canceled', {
                bubbles: false,
                cancelable: true,
            });

            this.canvas.dispatchEvent(event);
        }

        this.mode = Mode.IDLE;
    }

    private onMergeDone(objects: any[] | null, duration?: number): void {
        if (objects) {
            const event: CustomEvent = new CustomEvent('canvas.merged', {
                bubbles: false,
                cancelable: true,
                detail: {
                    duration,
                    states: objects,
                },
            });

            this.canvas.dispatchEvent(event);
        } else {
            const event: CustomEvent = new CustomEvent('canvas.canceled', {
                bubbles: false,
                cancelable: true,
            });

            this.canvas.dispatchEvent(event);
        }

        this.controller.merge({
            enabled: false,
        });

        this.mode = Mode.IDLE;
    }

    private onSplitDone(object: any): void {
        if (object) {
            const event: CustomEvent = new CustomEvent('canvas.splitted', {
                bubbles: false,
                cancelable: true,
                detail: {
                    state: object,
                    frame: object.frame,
                },
            });

            this.canvas.dispatchEvent(event);
        } else {
            const event: CustomEvent = new CustomEvent('canvas.canceled', {
                bubbles: false,
                cancelable: true,
            });

            this.canvas.dispatchEvent(event);
        }

        this.controller.split({
            enabled: false,
        });

        this.mode = Mode.IDLE;
    }

    private onGroupDone(objects?: any[]): void {
        if (objects) {
            const event: CustomEvent = new CustomEvent('canvas.groupped', {
                bubbles: false,
                cancelable: true,
                detail: {
                    states: objects,
                },
            });

            this.canvas.dispatchEvent(event);
        } else {
            const event: CustomEvent = new CustomEvent('canvas.canceled', {
                bubbles: false,
                cancelable: true,
            });

            this.canvas.dispatchEvent(event);
        }

        this.controller.group({
            enabled: false,
        });

        this.mode = Mode.IDLE;
    }

    private onFindObject(e: MouseEvent): void {
        if (e.which === 1 || e.which === 0) {
            const { offset } = this.controller.geometry;
            const [x, y] = translateToSVG(this.content, [e.clientX, e.clientY]);
            const event: CustomEvent = new CustomEvent('canvas.find', {
                bubbles: false,
                cancelable: true,
                detail: {
                    x: x - offset,
                    y: y - offset,
                    states: this.controller.objects,
                },
            });

            this.canvas.dispatchEvent(event);

            e.preventDefault();
        }
    }

    private onFocusRegion(x: number, y: number, width: number, height: number): void {
        // First of all, compute and apply scale
        let scale = null;

        if ((this.geometry.angle / 90) % 2) {
            // 90, 270, ..
            scale = Math.min(Math.max(Math.min(
                this.geometry.canvas.width / height,
                this.geometry.canvas.height / width,
            ), FrameZoom.MIN), FrameZoom.MAX);
        } else {
            scale = Math.min(Math.max(Math.min(
                this.geometry.canvas.width / width,
                this.geometry.canvas.height / height,
            ), FrameZoom.MIN), FrameZoom.MAX);
        }

        this.geometry = { ...this.geometry, scale };
        this.transformCanvas();

        const [canvasX, canvasY] = translateFromSVG(this.content, [
            x + width / 2,
            y + height / 2,
        ]);

        const canvasOffset = this.canvas.getBoundingClientRect();
        const [cx, cy] = [
            this.canvas.clientWidth / 2 + canvasOffset.left,
            this.canvas.clientHeight / 2 + canvasOffset.top,
        ];

        const dragged = {
            ...this.geometry,
            top: this.geometry.top + cy - canvasY,
            left: this.geometry.left + cx - canvasX,
            scale,
        };

        this.controller.geometry = dragged;
        this.geometry = dragged;
        this.moveCanvas();
    }

    private moveCanvas(): void {
        for (const obj of [this.background, this.grid, this.bitmap]) {
            obj.style.top = `${this.geometry.top}px`;
            obj.style.left = `${this.geometry.left}px`;
        }

        for (const obj of [this.content, this.text]) {
            obj.style.top = `${this.geometry.top - this.geometry.offset}px`;
            obj.style.left = `${this.geometry.left - this.geometry.offset}px`;
        }

        // Transform handlers
        this.drawHandler.transform(this.geometry);
        this.editHandler.transform(this.geometry);
        this.zoomHandler.transform(this.geometry);
    }

    private transformCanvas(): void {
        // Transform canvas
        for (const obj of [this.background, this.grid, this.content, this.bitmap]) {
            obj.style.transform = `scale(${this.geometry.scale}) rotate(${this.geometry.angle}deg)`;
        }

        // ISL MAGNIFYING GLASS
        this.magnifyingGlassContainer.style.transform = `rotate(${this.geometry.angle}deg)`;
        // ISL END

        // Transform grid
        this.gridPath.setAttribute('stroke-width', `${consts.BASE_GRID_WIDTH / (this.geometry.scale)}px`);

        // Transform all shape points
        for (const element of window.document.getElementsByClassName('svg_select_points')) {
            element.setAttribute(
                'stroke-width',
                `${consts.POINTS_STROKE_WIDTH / this.geometry.scale}`,
            );
            element.setAttribute(
                'r',
                `${consts.BASE_POINT_SIZE / this.geometry.scale}`,
            );
        }

        for (const element of
            window.document.getElementsByClassName('cvat_canvas_poly_direction')) {
            const angle = (element as any).instance.data('angle');

            (element as any).instance.style({
                transform: `scale(${1 / this.geometry.scale}) rotate(${angle}deg)`,
            });
        }

        for (const element of
            window.document.getElementsByClassName('cvat_canvas_selected_point')) {
            const previousWidth = element.getAttribute('stroke-width') as string;
            element.setAttribute(
                'stroke-width',
                `${+previousWidth * 2}`,
            );
        }

        // Transform all drawn shapes
        for (const key in this.svgShapes) {
            if (Object.prototype.hasOwnProperty.call(this.svgShapes, key)) {
                const object = this.svgShapes[key];
                object.attr({
                    'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                });
            }
        }

        // Transform all text
        for (const key in this.svgShapes) {
            if (Object.prototype.hasOwnProperty.call(this.svgShapes, key)
                && Object.prototype.hasOwnProperty.call(this.svgTexts, key)) {
                this.updateTextPosition(
                    this.svgTexts[key],
                    this.svgShapes[key],
                );
            }
        }

        // Transform handlers
        this.drawHandler.transform(this.geometry);
        this.editHandler.transform(this.geometry);
        this.autoborderHandler.transform(this.geometry);
    }

    private resizeCanvas(): void {
        for (const obj of [this.background, this.grid, this.bitmap]) {
            obj.style.width = `${this.geometry.image.width}px`;
            obj.style.height = `${this.geometry.image.height}px`;
        }

        for (const obj of [this.content, this.text]) {
            obj.style.width = `${this.geometry.image.width + this.geometry.offset * 2}px`;
            obj.style.height = `${this.geometry.image.height + this.geometry.offset * 2}px`;
        }
    }


    private setupObjects(states: any[]): void {
        const { offset } = this.controller.geometry;
        const translate = (points: number[]): number[] => points
            .map((coord: number): number => coord + offset);

        const created = [];
        const updated = [];
        for (const state of states) {
            if (!(state.clientID in this.drawnStates)) {
                created.push(state);
            } else {
                const drawnState = this.drawnStates[state.clientID];
                // object has been changed or changed frame for a track
                if (drawnState.updated !== state.updated || drawnState.frame !== state.frame) {
                    updated.push(state);
                }
            }
        }
        const newIDs = states.map((state: any): number => state.clientID);
        const deleted = Object.keys(this.drawnStates).map((clientID: string): number => +clientID)
            .filter((id: number): boolean => !newIDs.includes(id))
            .map((id: number): any => this.drawnStates[id]);

        // ISL MANUAL TRACKING
        if (this.trackingElement.enable !== false) {
            if (newIDs.includes(this.trackingElement.trackID)) {
                const [trackstate] = states.filter((el: any) => (el.clientID === this.trackingElement.trackID));

                if (!this.trackingElement.trackedframes.includes(trackstate.frame)) {
                    this.trackingElement.trackedframes.push(trackstate.frame);
                    this.trackingElement.trackedwidthheight.push([
                        trackstate.points[2] - trackstate.points[0],
                        trackstate.points[3] - trackstate.points[1],
                    ]);
                }
                this.trackingElement.index = this.trackingElement.trackedframes.indexOf(trackstate.frame);

                this.trackingElement.trackedStates[this.trackingElement.index] = trackstate;
                this.trackingElement.trackedcentroids[this.trackingElement.index] = this.trackingElement.mousecoords;

                let resizewidth: any = trackstate.points[2] - trackstate.points[0];
                let resizeheight: any = trackstate.points[3] - trackstate.points[1];

                if (this.trackingElement.interpolatekeyframes.length != 0) {
                    let interpolatekeyframes = [...this.trackingElement.interpolatekeyframes].sort((a, b) => (a-b));
                    if (!interpolatekeyframes.includes(Math.min(...this.trackingElement.trackedframes))) {
                        interpolatekeyframes = [Math.min(...this.trackingElement.trackedframes), ...interpolatekeyframes];
                    }
                    let leftframe = null;
                    let rightframe = null;
                    for (let i = 0; i < interpolatekeyframes.length; i++) {
                        if (trackstate.frame >= interpolatekeyframes[i]) {
                            leftframe = interpolatekeyframes[i];
                        } else if (trackstate.frame < interpolatekeyframes[i]){
                            rightframe = interpolatekeyframes[i];
                            break;
                        }
                    }
                    resizewidth = this.interpolateSize(
                        trackstate.frame,
                        leftframe,
                        (leftframe !== null) ? this.trackingElement.trackedwidthheight[this.trackingElement.trackedframes.indexOf(leftframe)][0] : null,
                        rightframe,
                        (rightframe !== null) ? this.trackingElement.trackedwidthheight[this.trackingElement.trackedframes.indexOf(rightframe)][0] : null,
                    );
                    resizeheight = this.interpolateSize(
                        trackstate.frame,
                        leftframe,
                        (leftframe !== null) ? this.trackingElement.trackedwidthheight[this.trackingElement.trackedframes.indexOf(leftframe)][1] : null,
                        rightframe,
                        (rightframe !== null) ? this.trackingElement.trackedwidthheight[this.trackingElement.trackedframes.indexOf(rightframe)][1] : null,
                    );
                }

                this.trackingElement.trackedwidthheight[this.trackingElement.index] = [
                    resizewidth,
                    resizeheight,
                ];
                if (this.trackingElement.trackrect) {
                    const { offset } = this.controller.geometry;
                    this.trackingElement.trackrect.size(resizewidth, resizeheight)
                        .center(this.trackingElement.mousecoords[0] + offset, this.trackingElement.mousecoords[1] + offset);
                }
            } else {
                this.trackingElement.index = null;
            }
        }
        // ISL END

        if (deleted.length || updated.length || created.length) {
            if (this.activeElement.clientID !== null) {
                this.deactivate();
            }

            for (const state of deleted) {
                if (state.clientID in this.svgTexts) {
                    this.svgTexts[state.clientID].remove();
                }

                this.svgShapes[state.clientID].off('click.canvas');
                this.svgShapes[state.clientID].remove();
                delete this.drawnStates[state.clientID];

                // ISL BACKGROUND FILTER
                if (state.clientID == this.lastShapeClicked) {
                    this.focusBox(false);
                    this.lastShapeClicked = null;
                }
                // ISL END
            }

            this.addObjects(created, translate);
            this.updateObjects(updated, translate);
            this.sortObjects();

            if (this.controller.activeElement.clientID !== null) {
                const { clientID } = this.controller.activeElement;
                if (states.map((state: any): number => state.clientID).includes(clientID)) {
                    this.activate(this.controller.activeElement);
                }
            }

            this.autoborderHandler.updateObjects();
        }
        // ISL BACKGROUND FILTER
        this.focusBox(true);
        // ISL END
    }

    private hideDirection(shape: SVG.Polygon | SVG.PolyLine): void {
        /* eslint class-methods-use-this: 0 */
        const handler = shape.remember('_selectHandler');
        if (!handler || !handler.nested) return;
        const nested = handler.nested as SVG.Parent;
        if (nested.children().length) {
            nested.children()[0].removeClass('cvat_canvas_first_poly_point');
        }

        const node = nested.node as SVG.LinkedHTMLElement;
        const directions = node.getElementsByClassName('cvat_canvas_poly_direction');
        for (const direction of directions) {
            const { instance } = (direction as any);
            instance.off('click');
            instance.remove();
        }
    }

    private showDirection(state: any, shape: SVG.Polygon | SVG.PolyLine): void {
        const path = consts.ARROW_PATH;

        const points = parsePoints(state.points);
        const handler = shape.remember('_selectHandler');

        if (!handler || !handler.nested) return;
        const firstCircle = handler.nested.children()[0];
        const secondCircle = handler.nested.children()[1];
        firstCircle.addClass('cvat_canvas_first_poly_point');

        const [cx, cy] = [
            (secondCircle.cx() + firstCircle.cx()) / 2,
            (secondCircle.cy() + firstCircle.cy()) / 2,
        ];
        const [firstPoint, secondPoint] = points.slice(0, 2);
        const xAxis = { i: 1, j: 0 };
        const baseVector = { i: secondPoint.x - firstPoint.x, j: secondPoint.y - firstPoint.y };
        const baseVectorLength = vectorLength(baseVector);
        let cosinus = 0;

        if (baseVectorLength !== 0) {
            // two points have the same coordinates
            cosinus = scalarProduct(xAxis, baseVector)
                / (vectorLength(xAxis) * baseVectorLength);
        }
        const angle = Math.acos(cosinus) * (Math.sign(baseVector.j) || 1) * 180 / Math.PI;

        const pathElement = handler.nested.path(path).fill('white')
            .stroke({
                width: 1,
                color: 'black',
            }).addClass('cvat_canvas_poly_direction').style({
                'transform-origin': `${cx}px ${cy}px`,
                transform: `scale(${1 / this.geometry.scale}) rotate(${angle}deg)`,
            }).move(cx, cy);

        pathElement.on('click', (e: MouseEvent): void => {
            if (e.button === 0) {
                e.stopPropagation();
                if (state.shapeType === 'polygon') {
                    const reversedPoints = [points[0], ...points.slice(1).reverse()];
                    this.onEditDone(state, pointsToNumberArray(reversedPoints));
                } else {
                    const reversedPoints = points.reverse();
                    this.onEditDone(state, pointsToNumberArray(reversedPoints));
                }
            }
        });

        pathElement.data('angle', angle);
        pathElement.dmove(-pathElement.width() / 2, -pathElement.height() / 2);
    }

    private selectize(value: boolean, shape: SVG.Element): void {
        const self = this;
        const { offset } = this.controller.geometry;
        const translate = (points: number[]): number[] => points
            .map((coord: number): number => coord - offset);

        function mousedownHandler(e: MouseEvent): void {
            if (e.button !== 0) return;
            e.preventDefault();

            const pointID = Array.prototype.indexOf
                .call(((e.target as HTMLElement).parentElement as HTMLElement).children, e.target);

            if (self.activeElement.clientID !== null) {
                const [state] = self.controller.objects
                    .filter((_state: any): boolean => (
                        _state.clientID === self.activeElement.clientID
                    ));

                if (['polygon', 'polyline', 'points'].includes(state.shapeType)) {
                    if (e.ctrlKey) {
                        const { points } = state;
                        self.onEditDone(
                            state,
                            points.slice(0, pointID * 2).concat(points.slice(pointID * 2 + 2)),
                        );
                    } else if (e.shiftKey) {
                        self.canvas.dispatchEvent(new CustomEvent('canvas.editstart', {
                            bubbles: false,
                            cancelable: true,
                        }));

                        self.mode = Mode.EDIT;
                        self.deactivate();
                        self.editHandler.edit({
                            enabled: true,
                            state,
                            pointID,
                        });
                    }
                }
            }
        }

        function dblClickHandler(e: MouseEvent): void {
            e.preventDefault();

            if (self.activeElement.clientID !== null) {
                const [state] = self.controller.objects
                    .filter((_state: any): boolean => (
                        _state.clientID === self.activeElement.clientID
                    ));

                if (state.shapeType === 'cuboid') {
                    if (e.shiftKey) {
                        const points = translate(pointsToNumberArray((e.target as any)
                            .parentElement.parentElement.instance.attr('points')));
                        self.onEditDone(
                            state,
                            points,
                        );
                    }
                }
            }
        }

        function contextMenuHandler(e: MouseEvent): void {
            const pointID = Array.prototype.indexOf
                .call(((e.target as HTMLElement).parentElement as HTMLElement).children, e.target);
            if (self.activeElement.clientID !== null) {
                const [state] = self.controller.objects
                    .filter((_state: any): boolean => (
                        _state.clientID === self.activeElement.clientID
                    ));
                self.canvas.dispatchEvent(new CustomEvent('canvas.contextmenu', {
                    bubbles: false,
                    cancelable: true,
                    detail: {
                        mouseEvent: e,
                        objectState: state,
                        pointID,
                    },
                }));
            }
            e.preventDefault();
        }

        if (value) {
            (shape as any).selectize(value, {
                deepSelect: true,
                pointSize: 2 * consts.BASE_POINT_SIZE / self.geometry.scale,
                rotationPoint: false,
                pointType(cx: number, cy: number): SVG.Circle {
                    const circle: SVG.Circle = this.nested
                        .circle(this.options.pointSize)
                        .stroke('black')
                        .fill('inherit')
                        .center(cx, cy)
                        .attr({
                            'fill-opacity': 1,
                            'stroke-width': consts.POINTS_STROKE_WIDTH / self.geometry.scale,
                        });

                    circle.on('mouseenter', (): void => {
                        circle.attr({
                            'stroke-width': consts.POINTS_SELECTED_STROKE_WIDTH / self.geometry.scale,
                        });

                        circle.on('dblclick', dblClickHandler);
                        circle.on('mousedown', mousedownHandler);
                        circle.on('contextmenu', contextMenuHandler);
                        circle.addClass('cvat_canvas_selected_point');
                    });

                    circle.on('mouseleave', (): void => {
                        circle.attr({
                            'stroke-width': consts.POINTS_STROKE_WIDTH / self.geometry.scale,
                        });

                        circle.off('dblclick', dblClickHandler);
                        circle.off('mousedown', mousedownHandler);
                        circle.off('contextmenu', contextMenuHandler);
                        circle.removeClass('cvat_canvas_selected_point');
                    });

                    return circle;
                },
            });
        } else {
            (shape as any).selectize(false, {
                deepSelect: true,
            });
        }

        const handler = shape.remember('_selectHandler');
        if (handler && handler.nested) {
            handler.nested.fill(shape.attr('fill'));
        }
    }

    public constructor(model: CanvasModel & Master, controller: CanvasController) {
        this.controller = controller;
        this.geometry = controller.geometry;
        this.svgShapes = {};
        this.svgTexts = {};
        this.drawnStates = {};
        this.activeElement = {
            clientID: null,
            attributeID: null,
        };
        this.configuration = model.configuration;
        this.mode = Mode.IDLE;
        this.serviceFlags = {
            drawHidden: {},
        };

        // Create HTML elements
        this.loadingAnimation = window.document
            .createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.text = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.adoptedText = (SVG.adopt((this.text as any as HTMLElement)) as SVG.Container);
        this.background = window.document.createElement('canvas');
        this.bitmap = window.document.createElement('canvas');
        // window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');

        this.grid = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.gridPath = window.document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.gridPattern = window.document.createElementNS('http://www.w3.org/2000/svg', 'pattern');

        this.content = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.adoptedContent = (SVG.adopt((this.content as any as HTMLElement)) as SVG.Container);

        this.canvas = window.document.createElement('div');

        const loadingCircle: SVGCircleElement = window.document
            .createElementNS('http://www.w3.org/2000/svg', 'circle');
        const gridDefs: SVGDefsElement = window.document
            .createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gridRect: SVGRectElement = window.document
            .createElementNS('http://www.w3.org/2000/svg', 'rect');

        // ISL MAGNIFYING GLASS
        this.magnifyingGlassRadius = 75;
        this.magnifyingGlassContainer = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.magnifyingGlassForeignObject = window.document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        const magnifyingGlassDiv = window.document.createElement('div');
        this.magnifyingGlassImage = window.document.createElement('canvas');

        this.magnifyingGlassContainer.setAttribute('id', 'cvat_canvas_magnifying_glass_container');
        this.magnifyingGlassContainer.classList.add('cvat_canvas_hidden');
        this.magnifyingGlassForeignObject.setAttribute('id', 'cvat_canvas_foreign');
        this.magnifyingGlassForeignObject.setAttribute('height', `${this.magnifyingGlassRadius * 2}`);
        this.magnifyingGlassForeignObject.setAttribute('width', `${this.magnifyingGlassRadius * 2}`);
        this.magnifyingGlassImage.setAttribute('id', 'magnifying_glass_image');
        this.magnifyingGlassImage.setAttribute('height', `${this.magnifyingGlassRadius * 2}`);
        this.magnifyingGlassImage.setAttribute('width', `${this.magnifyingGlassRadius * 2}`);

        // define clip path for 'border'
        var defs = window.document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        var clipPath = window.document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clipPath.setAttributeNS(null, 'id', 'clip');
        this.circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.circle.setAttributeNS(null, 'id', 'circle');
        this.circle.setAttributeNS(null, 'cx', `${this.magnifyingGlassRadius}`);
        this.circle.setAttributeNS(null, 'cy', `${this.magnifyingGlassRadius}`);
        this.circle.setAttributeNS(null, 'r', `${this.magnifyingGlassRadius}`);
        this.circle.setAttributeNS(null, 'fill', '#FFFFFF');
        this.circle.setAttributeNS(null, 'fill-opacity', '0.0')
        //separate circle for the border, can't use the same circle as above
        this.border = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.border.setAttributeNS(null, 'cx', `${this.magnifyingGlassRadius}`);
        this.border.setAttributeNS(null, 'cy', `${this.magnifyingGlassRadius}`);
        this.border.setAttributeNS(null, 'r', `${this.magnifyingGlassRadius}`);
        this.border.setAttributeNS(null, 'fill', '#FFFFFF');
        this.border.setAttributeNS(null, 'style', "fill:none;stroke:#ff0000;stroke-width:3");

        var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#circle');
        defs.appendChild(clipPath);
        clipPath.appendChild(use);
        this.magnifyingGlassContainer.appendChild(defs);
        this.magnifyingGlassContainer.appendChild(this.circle);
        this.magnifyingGlassForeignObject.setAttribute('clip-path', 'url(#clip)');
        magnifyingGlassDiv.appendChild(this.magnifyingGlassImage);
        this.magnifyingGlassForeignObject.appendChild(magnifyingGlassDiv);
        this.magnifyingGlassContainer.appendChild(this.magnifyingGlassForeignObject);
        this.magnifyingGlassContainer.appendChild(this.border);

        this.canvas.appendChild(this.magnifyingGlassContainer);
        // ISL END

        // ISL FIXED ZOOM
        this.fixedZoomSize = 250;
        this.fixedZoomMultiplier = 2;
        // ISL END
        // Setup loading animation
        this.loadingAnimation.setAttribute('id', 'cvat_canvas_loading_animation');
        loadingCircle.setAttribute('id', 'cvat_canvas_loading_circle');
        loadingCircle.setAttribute('r', '30');
        loadingCircle.setAttribute('cx', '50%');
        loadingCircle.setAttribute('cy', '50%');

        // Setup grid
        this.grid.setAttribute('id', 'cvat_canvas_grid');
        this.grid.setAttribute('version', '2');
        this.gridPath.setAttribute('d', 'M 1000 0 L 0 0 0 1000');
        this.gridPath.setAttribute('fill', 'none');
        this.gridPath.setAttribute('stroke-width', `${consts.BASE_GRID_WIDTH}`);
        this.gridPath.setAttribute('opacity', 'inherit');
        this.gridPattern.setAttribute('id', 'cvat_canvas_grid_pattern');
        this.gridPattern.setAttribute('width', '100');
        this.gridPattern.setAttribute('height', '100');
        this.gridPattern.setAttribute('patternUnits', 'userSpaceOnUse');
        gridRect.setAttribute('width', '100%');
        gridRect.setAttribute('height', '100%');
        gridRect.setAttribute('fill', 'url(#cvat_canvas_grid_pattern)');

        // Setup content
        this.text.setAttribute('id', 'cvat_canvas_text_content');
        this.background.setAttribute('id', 'cvat_canvas_background');
        this.content.setAttribute('id', 'cvat_canvas_content');
        this.bitmap.setAttribute('id', 'cvat_canvas_bitmap');
        this.bitmap.style.display = 'none';

        // Setup wrappers
        this.canvas.setAttribute('id', 'cvat_canvas_wrapper');

        // Unite created HTML elements together
        this.loadingAnimation.appendChild(loadingCircle);
        this.grid.appendChild(gridDefs);
        this.grid.appendChild(gridRect);

        gridDefs.appendChild(this.gridPattern);
        this.gridPattern.appendChild(this.gridPath);

        this.canvas.appendChild(this.loadingAnimation);
        this.canvas.appendChild(this.text);
        this.canvas.appendChild(this.background);
        this.canvas.appendChild(this.bitmap);
        this.canvas.appendChild(this.grid);
        this.canvas.appendChild(this.content);


        const self = this;

        // Setup API handlers
        this.autoborderHandler = new AutoborderHandlerImpl(
            this.content,
        );
        this.drawHandler = new DrawHandlerImpl(
            this.onDrawDone.bind(this),
            this.adoptedContent,
            this.adoptedText,
            this.autoborderHandler,
        );
        this.editHandler = new EditHandlerImpl(
            this.onEditDone.bind(this),
            this.adoptedContent,
            this.autoborderHandler,
        );
        this.mergeHandler = new MergeHandlerImpl(
            this.onMergeDone.bind(this),
            this.onFindObject.bind(this),
            this.adoptedContent,
        );
        this.splitHandler = new SplitHandlerImpl(
            this.onSplitDone.bind(this),
            this.onFindObject.bind(this),
            this.adoptedContent,
        );
        this.groupHandler = new GroupHandlerImpl(
            this.onGroupDone.bind(this),
            (): any[] => this.controller.objects,
            this.onFindObject.bind(this),
            this.adoptedContent,
        );
        this.zoomHandler = new ZoomHandlerImpl(
            this.onFocusRegion.bind(this),
            this.adoptedContent,
            this.geometry,
        );

        // Setup event handlers
        this.content.addEventListener('dblclick', (e: MouseEvent): void => {
            if (e.ctrlKey || e.shiftKey) return;
            self.controller.fit();
            e.preventDefault();
        });

        this.content.addEventListener('mousedown', (event): void => {
            if ([0, 1].includes(event.button)) {
                if ([Mode.IDLE, Mode.DRAG_CANVAS, Mode.MERGE, Mode.SPLIT].includes(this.mode)
                    || event.button === 1 || event.altKey
                ) {
                    self.controller.enableDrag(event.clientX, event.clientY);
                }
                // ISL BACKGROUND FILTER
                if (this.lastShapeClicked != null) {
                    this.focusBox(false);
                    this.lastShapeClicked = null;
                }
                // ISL END
            }
        });

        window.document.addEventListener('mouseup', (event): void => {
            if (event.which === 1 || event.which === 2) {
                self.controller.disableDrag();
            }
        });

        this.content.addEventListener('wheel', (event): void => {
            // ISL MAGNIFYING GLASS
            if (this.mode == Mode.RESIZE) {
                if (event.deltaY < 0 && this.magnifyingGlassParameters.zoomScale > 30) {
                    this.magnifyingGlassParameters.zoomScale -= 5;
                    this.updateMagnifyingGlass();
                } else if (event.deltaY > 0 && this.magnifyingGlassParameters.zoomScale < 180) {
                    this.magnifyingGlassParameters.zoomScale += 5;
                    this.updateMagnifyingGlass();
                }
                return
            }
            // ISL END


            const { offset } = this.controller.geometry;
            const point = translateToSVG(this.content, [event.clientX, event.clientY]);
            self.controller.zoom(point[0] - offset, point[1] - offset, event.deltaY > 0 ? -1 : 1);
            this.canvas.dispatchEvent(new CustomEvent('canvas.zoom', {
                bubbles: false,
                cancelable: true,
            }));
            event.preventDefault();
        });

        this.content.addEventListener('mousemove', (e): void => {
            // ISL LOCK ICON
            // Note: this.lockedBox function, when set to true, draws a solid color box around the highlighte shape

            // This part is intended to 1.) set this.lockedBox = true on mouseover of the locked shape, and
            // 2.) set this.lockedBox = false on mouseout of the locked shape
            for (var states in this.drawnStates) {                                  // on mousemove, check all shapes
                const  clientID  = this.drawnStates[states].clientID;
                const [state] = this.controller.objects
                .filter((_state: any): boolean => _state.clientID === clientID);
                if (state.lock) {                                                   // if a shape is locked
                    const shape = this.svgShapes[clientID];
                    (shape as any).on('mouseover', (): void => {                    // listen for mouseover event
                        console.log('mouseover');
                        if (this.lastShapeHighlighted !== clientID){
                            console.log('test');
                            console.log(clientID);
                        this.lastShapeHighlighted = clientID;
                        this.lockedBox(true);                                       // then set lockedBox to true
                    }
                        })
                        (shape as any).on('mouseout', (): void => {                 // also listen for when the mouse leaves the shape
                            console.log('mouseleave');                              // then set lockedBox to false
                            this.lastShapeHighlighted = 0;
                            this.lockedBox(false);
                        }
                            )
                }
            }
            // END

            self.controller.drag(e.clientX, e.clientY);

            // ISL FIXED ZOOM and ISL FIXED ZOOM - CROSSHAIR
            const { offset } = this.controller.geometry;    // Declare variables for ISL FIXED ZOOM and CROSSHAIR
            const [x, y] = translateToSVG(this.content, [e.clientX, e.clientY]);
            var zoomCanvas = document.getElementById('zoom-canvas');
            var zoomCanvasCtx = zoomCanvas.getContext('2d');
            var zoomX = x - offset - (this.fixedZoomSize/this.fixedZoomMultiplier)/2;
            var zoomY = y - offset - (this.fixedZoomSize/this.fixedZoomMultiplier)/2;
            var zoomImg = this.background;
            // ISL END

            // ISL MAGNIFYING GLASS
            this.magnifyingGlassParameters.cursorX = e.clientX;
            this.magnifyingGlassParameters.cursorY = e.clientY;

            if (this.mode == Mode.RESIZE) {
                this.updateMagnifyingGlass();
            }
            // ISL END

            // ISL FIXED ZOOM and ISL FIXED ZOOM - CROSSHAIR
            zoomCanvasCtx.clearRect(0,0,this.fixedZoomSize,this.fixedZoomSize); // Clear canvas
            zoomCanvasCtx.drawImage(zoomImg,zoomX,zoomY,(this.fixedZoomSize/this.fixedZoomMultiplier), // Show zoomed image
                (this.fixedZoomSize/this.fixedZoomMultiplier),0,0,this.fixedZoomSize,this.fixedZoomSize);
            if (this.mode === Mode.DRAW || this.mode === Mode.RESIZE) { // Operate only on DRAW and RESIZE modes
            zoomCanvasCtx.beginPath();  // Draw crosshair lines
            zoomCanvasCtx.lineWidth = 2;
            zoomCanvasCtx.strokeStyle = 'red';
            zoomCanvasCtx.moveTo(this.fixedZoomSize/2,0);
            zoomCanvasCtx.lineTo(this.fixedZoomSize/2,this.fixedZoomSize);
            zoomCanvasCtx.moveTo(0,this.fixedZoomSize/2);
            zoomCanvasCtx.lineTo(this.fixedZoomSize,this.fixedZoomSize/2);
            zoomCanvasCtx.stroke();
            }
            // ISL END

            if (this.mode !== Mode.IDLE) return;
            if (e.ctrlKey || e.shiftKey) return;

            // ISL MANUAL TRACKING
            this.trackingElement.mousecoords = [x - offset, y - offset];
            // ISL END

            const event: CustomEvent = new CustomEvent('canvas.moved', {
                bubbles: false,
                cancelable: true,
                detail: {
                    x: x - offset,
                    y: y - offset,
                    states: this.controller.objects,
                },
            });

            this.canvas.dispatchEvent(event);
        });

        this.content.oncontextmenu = (): boolean => false;
        model.subscribe(this);
    }

    public notify(model: CanvasModel & Master, reason: UpdateReasons): void {
        this.geometry = this.controller.geometry;
        if (reason === UpdateReasons.CONFIG_UPDATED) {
            const { activeElement } = this;
            this.deactivate();

            if (model.configuration.displayAllText && !this.configuration.displayAllText) {
                for (const i in this.drawnStates) {
                    if (!(i in this.svgTexts)) {
                        this.svgTexts[i] = this.addText(this.drawnStates[i]);
                        this.updateTextPosition(
                            this.svgTexts[i],
                            this.svgShapes[i],
                        );
                    }
                }
            } else if (model.configuration.displayAllText === false
                    && this.configuration.displayAllText) {
                for (const i in this.drawnStates) {
                    if (i in this.svgTexts && Number.parseInt(i, 10) !== activeElement.clientID) {
                        this.svgTexts[i].remove();
                        delete this.svgTexts[i];
                    }
                }
            }

            this.configuration = model.configuration;
            this.activate(activeElement);
            this.editHandler.configurate(this.configuration);
            this.drawHandler.configurate(this.configuration);

            // remove if exist and not enabled
            // this.setupObjects([]);
            // this.setupObjects(model.objects);
        } else if (reason === UpdateReasons.BITMAP) {
            const { imageBitmap } = model;
            if (imageBitmap) {
                this.bitmap.style.display = '';
                this.redrawBitmap();
            } else {
                this.bitmap.style.display = 'none';
            }
        } else if (reason === UpdateReasons.IMAGE_CHANGED) {
            const { image } = model;
            if (!image) {
                this.loadingAnimation.classList.remove('cvat_canvas_hidden');
            } else {
                this.loadingAnimation.classList.add('cvat_canvas_hidden');
                const ctx = this.background.getContext('2d');
                this.background.setAttribute('width', `${image.renderWidth}px`);
                this.background.setAttribute('height', `${image.renderHeight}px`);

                if (ctx) {
                    if (image.imageData instanceof ImageData) {
                        ctx.scale(image.renderWidth / image.imageData.width,
                            image.renderHeight / image.imageData.height);
                        ctx.putImageData(image.imageData, 0, 0);
                        // Transformation matrix must not affect the putImageData() method.
                        // By this reason need to redraw the image to apply scale.
                        // https://www.w3.org/TR/2dcontext/#dom-context-2d-putimagedata
                        ctx.drawImage(this.background, 0, 0);
                    } else {
                        ctx.drawImage(image.imageData, 0, 0);
                    }
                }
                this.moveCanvas();
                this.resizeCanvas();
                this.transformCanvas();
                // ISL BACKGROUND FILTER
                this.getFilteredBG();
                // ISL END
            }
        } else if (reason === UpdateReasons.FITTED_CANVAS) {
            // Canvas geometry is going to be changed. Old object positions aren't valid any more
            this.setupObjects([]);
            this.moveCanvas();
            this.resizeCanvas();
        } else if ([UpdateReasons.IMAGE_ZOOMED, UpdateReasons.IMAGE_FITTED].includes(reason)) {
            this.moveCanvas();
            this.transformCanvas();
            if (reason === UpdateReasons.IMAGE_FITTED) {
                this.canvas.dispatchEvent(new CustomEvent('canvas.fit', {
                    bubbles: false,
                    cancelable: true,
                }));
            }
        } else if (reason === UpdateReasons.IMAGE_MOVED) {
            this.moveCanvas();
        } else if ([UpdateReasons.OBJECTS_UPDATED, UpdateReasons.SET_Z_LAYER].includes(reason)) {
            if (this.mode === Mode.GROUP) {
                this.groupHandler.resetSelectedObjects();
            }
            this.setupObjects(this.controller.objects);
            if (this.mode === Mode.MERGE) {
                this.mergeHandler.repeatSelection();
            }
            const event: CustomEvent = new CustomEvent('canvas.setup');
            this.canvas.dispatchEvent(event);
        } else if (reason === UpdateReasons.GRID_UPDATED) {
            const size: Size = this.geometry.grid;
            this.gridPattern.setAttribute('width', `${size.width}`);
            this.gridPattern.setAttribute('height', `${size.height}`);
        } else if (reason === UpdateReasons.SHAPE_FOCUSED) {
            const {
                padding,
                clientID,
            } = this.controller.focusData;
            const object = this.svgShapes[clientID];
            if (object) {
                const bbox: SVG.BBox = object.bbox();
                this.onFocusRegion(bbox.x - padding, bbox.y - padding,
                    bbox.width + padding * 2, bbox.height + padding * 2);
            }
        } else if (reason === UpdateReasons.SHAPE_ACTIVATED) {
            this.activate(this.controller.activeElement);
        } else if (reason === UpdateReasons.DRAG_CANVAS) {
            if (this.mode === Mode.DRAG_CANVAS) {
                this.canvas.dispatchEvent(new CustomEvent('canvas.dragstart', {
                    bubbles: false,
                    cancelable: true,
                }));
                this.canvas.style.cursor = 'move';
            } else {
                this.canvas.dispatchEvent(new CustomEvent('canvas.dragstop', {
                    bubbles: false,
                    cancelable: true,
                }));
                this.canvas.style.cursor = '';
            }
        } else if (reason === UpdateReasons.ZOOM_CANVAS) {
            if (this.mode === Mode.ZOOM_CANVAS) {
                this.canvas.dispatchEvent(new CustomEvent('canvas.zoomstart', {
                    bubbles: false,
                    cancelable: true,
                }));
                this.canvas.style.cursor = 'zoom-in';
                this.zoomHandler.zoom();
            } else {
                this.canvas.dispatchEvent(new CustomEvent('canvas.zoomstop', {
                    bubbles: false,
                    cancelable: true,
                }));
                this.canvas.style.cursor = '';
                this.zoomHandler.cancel();
            }
        } else if (reason === UpdateReasons.DRAW) {
            const data: DrawData = this.controller.drawData;
            if (data.enabled && this.mode === Mode.IDLE) {
                this.canvas.style.cursor = 'crosshair';
                this.mode = Mode.DRAW;
                // ISL FIXED ZOOM - CROSSHAIR
                // This is a repeat of the entries in the 'mousemove' event. How can we optimize this?
                var zoomCanvas = document.getElementById('zoom-canvas');
                var zoomCanvasCtx = zoomCanvas.getContext('2d');
                zoomCanvasCtx.beginPath();  // Draw crosshair lines
                zoomCanvasCtx.lineWidth = 2;
                zoomCanvasCtx.strokeStyle = 'red';
                zoomCanvasCtx.moveTo(this.fixedZoomSize/2,0);
                zoomCanvasCtx.lineTo(this.fixedZoomSize/2,this.fixedZoomSize);
                zoomCanvasCtx.moveTo(0,this.fixedZoomSize/2);
                zoomCanvasCtx.lineTo(this.fixedZoomSize,this.fixedZoomSize/2);
                zoomCanvasCtx.stroke();
                // ISL END
                if (typeof (data.redraw) === 'number') {
                    this.setupServiceHidden(data.redraw, true);
                }
                this.drawHandler.draw(data, this.geometry);
            } else {
                this.canvas.style.cursor = '';
                if (this.mode !== Mode.IDLE) {
                    this.drawHandler.draw(data, this.geometry);
                }
            }
        } else if (reason === UpdateReasons.MERGE) {
            const data: MergeData = this.controller.mergeData;
            if (data.enabled) {
                this.canvas.style.cursor = 'copy';
                this.mode = Mode.MERGE;
            } else {
                this.canvas.style.cursor = '';
            }
            this.mergeHandler.merge(data);
        } else if (reason === UpdateReasons.SPLIT) {
            const data: SplitData = this.controller.splitData;
            if (data.enabled) {
                this.canvas.style.cursor = 'copy';
                this.mode = Mode.SPLIT;
            } else {
                this.canvas.style.cursor = '';
            }
            this.splitHandler.split(data);
        } else if (reason === UpdateReasons.GROUP) {
            const data: GroupData = this.controller.groupData;
            if (data.enabled) {
                this.canvas.style.cursor = 'copy';
                this.mode = Mode.GROUP;
            } else {
                this.canvas.style.cursor = '';
            }
            this.groupHandler.group(data);
        } else if (reason === UpdateReasons.SELECT) {
            if (this.mode === Mode.MERGE) {
                this.mergeHandler.select(this.controller.selected);
            } else if (this.mode === Mode.SPLIT) {
                this.splitHandler.select(this.controller.selected);
            } else if (this.mode === Mode.GROUP) {
                this.groupHandler.select(this.controller.selected);
            }
            // ISL MANUAL TRACKING
        } else if (reason === UpdateReasons.SWITCH_TRACKING) {
            if (this.trackingElement.enable) {
                this.startTracking();
            } else {
                this.stopTracking();
            }
            // ISL END
        } else if (reason === UpdateReasons.CANCEL) {
            if (this.mode === Mode.DRAW) {
                this.drawHandler.cancel();
            } else if (this.mode === Mode.MERGE) {
                this.mergeHandler.cancel();
            } else if (this.mode === Mode.SPLIT) {
                this.splitHandler.cancel();
            } else if (this.mode === Mode.GROUP) {
                this.groupHandler.cancel();
            } else if (this.mode === Mode.EDIT) {
                this.editHandler.cancel();
            } else if (this.mode === Mode.DRAG_CANVAS) {
                this.canvas.dispatchEvent(new CustomEvent('canvas.dragstop', {
                    bubbles: false,
                    cancelable: true,
                }));
            } else if (this.mode === Mode.ZOOM_CANVAS) {
                this.zoomHandler.cancel();
                this.canvas.dispatchEvent(new CustomEvent('canvas.zoomstop', {
                    bubbles: false,
                    cancelable: true,
                }));
            }
            this.mode = Mode.IDLE;
            this.canvas.style.cursor = '';
        }

        if (model.imageBitmap
            && [UpdateReasons.IMAGE_CHANGED,
            UpdateReasons.OBJECTS_UPDATED,
            UpdateReasons.SET_Z_LAYER,
            ].includes(reason)
        ) {
            this.redrawBitmap();
        }
    }

    public html(): HTMLDivElement {
        return this.canvas;
    }

    // ISL MANUAL TRACKING
    private interpolateSize = (targetframe: number, leftframe: number | null, leftsize: number, rightframe: number | null, rightsize: number): number => {
        if (leftframe !== null && rightframe !== null) {
            if (leftframe == rightframe) {
                return leftsize;
            }
            const newSize = leftsize + (rightsize - leftsize) * (targetframe - leftframe) / (rightframe - leftframe);
            return newSize;
        } else if (leftframe !== null) {
            return leftsize;
        } else if (rightframe !== null) {
            return rightsize;
        }
    }

    private trackingMouseClickEventHandler = (event: any): void => {
        if (event.which === 1) {
            const states = this.trackingElement.trackedStates;
            for (var i = 0; i < this.trackingElement.trackedframes.length; i++) {
                if (this.trackingElement.interpolatekeyframes.length != 0) {
                    let interpolatekeyframes = [...this.trackingElement.interpolatekeyframes].sort((a, b) => (a-b));
                    if (!interpolatekeyframes.includes(Math.min(...this.trackingElement.trackedframes))) {
                        interpolatekeyframes = [Math.min(...this.trackingElement.trackedframes), ...interpolatekeyframes];
                    }
                    if (!interpolatekeyframes.includes(Math.max(...this.trackingElement.trackedframes))) {
                        interpolatekeyframes = [...interpolatekeyframes, Math.max(...this.trackingElement.trackedframes)];
                    }
                    let leftframe = null;
                    let rightframe = null;
                    for (let k = 0; k < interpolatekeyframes.length; k++) {
                        if (states[i].frame >= interpolatekeyframes[k]) {
                            leftframe = interpolatekeyframes[k];
                        } else if (states[i].frame < interpolatekeyframes[k]){
                            rightframe = interpolatekeyframes[k];
                            break;
                        }
                    }
                    this.trackingElement.trackedwidthheight[i][0] = this.interpolateSize(
                        states[i].frame,
                        leftframe,
                        (leftframe !== null) ? this.trackingElement.trackedwidthheight[this.trackingElement.trackedframes.indexOf(leftframe)][0] : null,
                        rightframe,
                        (rightframe !== null) ? this.trackingElement.trackedwidthheight[this.trackingElement.trackedframes.indexOf(rightframe)][0] : null,
                    );
                    this.trackingElement.trackedwidthheight[i][1] = this.interpolateSize(
                        states[i].frame,
                        leftframe,
                        (leftframe !== null) ? this.trackingElement.trackedwidthheight[this.trackingElement.trackedframes.indexOf(leftframe)][1] : null,
                        rightframe,
                        (rightframe !== null) ? this.trackingElement.trackedwidthheight[this.trackingElement.trackedframes.indexOf(rightframe)][1] : null,
                    );
                }

                states[i].points = [
                    this.trackingElement.trackedcentroids[i][0] - this.trackingElement.trackedwidthheight[i][0] / 2,
                    this.trackingElement.trackedcentroids[i][1] - this.trackingElement.trackedwidthheight[i][1] / 2,
                    this.trackingElement.trackedcentroids[i][0] + this.trackingElement.trackedwidthheight[i][0] / 2,
                    this.trackingElement.trackedcentroids[i][1] + this.trackingElement.trackedwidthheight[i][1] / 2,
                ];
            }

            this.canvas.dispatchEvent(new CustomEvent('canvas.trackingdone', {
                bubbles: false,
                cancelable: true,
                detail: {
                    states,
                },
            }));
        } else if (event.which === 2) {
            this.trackingElement.scalemode = (this.trackingElement.scalemode + 1) % 3;
            if (this.trackingElement.scalemode == 0) {
                this.canvas.style.cursor = 'move';
            } else if (this.trackingElement.scalemode == 1) {
                this.canvas.style.cursor = 'ew-resize';
            } else if (this.trackingElement.scalemode == 2) {
                this.canvas.style.cursor = 'ns-resize';
            }
        }
        event.preventDefault();
    }

    private trackingMouseMoveEventHandler = (event: any): void => {
        this.trackingElement.trackedcentroids[this.trackingElement.index] = this.trackingElement.mousecoords;
        if (this.trackingElement.trackrect) {
            const { offset } = this.controller.geometry;
            this.trackingElement.trackrect.center(this.trackingElement.mousecoords[0] + offset, this.trackingElement.mousecoords[1] + offset);
        }
    }

    private trackingWheelEventHandler = (event: any): void => {
        let width = this.trackingElement.trackedwidthheight[this.trackingElement.index][0];
        let height = this.trackingElement.trackedwidthheight[this.trackingElement.index][1];

        if (event.deltaY < 0) {
            // SCROLL UP
            switch (this.trackingElement.scalemode) {
                case 0: {
                    width = width + 10;
                    height = height + 10;
                    break;
                }
                case 1: {
                    width = width + 5;
                    break;
                }
                case 2: {
                    height = height + 5;
                    break;
                }
                default: {
                    break;
                }
            }
        } else if (event.deltaY > 0) {
            // SCROLL DOWN
            switch (this.trackingElement.scalemode) {
                case 0: {
                    width = (width - 10 > 0) ? width - 10 : 1;
                    height = (height - 10 > 0) ? height - 10 : 1;
                    break;
                }
                case 1: {
                    width = (width - 5 > 0) ? width - 5 : 1;
                    break;
                }
                case 2: {
                    height = (height - 5 > 0) ? height - 5 : 1;
                    break;
                }
                default: {
                    break;
                }
            }
        }


        this.trackingElement.trackedwidthheight[this.trackingElement.index] = [width, height];
        if (this.trackingElement.trackrect) {
            const { offset } = this.controller.geometry;
            this.trackingElement.trackrect.size(width, height)
                .center(this.trackingElement.mousecoords[0] + offset, this.trackingElement.mousecoords[1] + offset);
        }

        this.trackingElement.interpolatekeyframes[this.trackingElement.index] = this.trackingElement.trackedframes[this.trackingElement.index];
        event.stopImmediatePropagation();
        event.preventDefault();
    }

    private startTracking(): void {
        const [state] = this.controller.objects.filter((el: any) => (el.clientID === this.trackingElement.trackID));;

        this.trackingElement.trackedframes.push(state.frame);
        this.trackingElement.index = this.trackingElement.trackedframes.indexOf(state.frame);

        this.trackingElement.trackedStates[this.trackingElement.index] = state;
        this.trackingElement.trackedcentroids[this.trackingElement.index] = this.trackingElement.mousecoords;

        this.trackingElement.trackedwidthheight[this.trackingElement.index] = [
            state.points[2] - state.points[0],
            state.points[3] - state.points[1],
        ];

        const { offset } = this.controller.geometry;
        this.trackingElement.trackrect = this.adoptedContent.rect().size(this.trackingElement.trackedwidthheight[this.trackingElement.index][0], this.trackingElement.trackedwidthheight[this.trackingElement.index][1]).attr({
            fill: '#000',
            'fill-opacity': 0.2,
            'shape-rendering': 'geometricprecision',
            stroke: '#000',
            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
        }).center(this.trackingElement.mousecoords[0] + offset, this.trackingElement.mousecoords[1] + offset)
            .on('mousewheel', this.trackingWheelEventHandler);

        this.canvas.addEventListener('canvas.moved', this.trackingMouseMoveEventHandler, true);
        this.content.addEventListener('mousedown', this.trackingMouseClickEventHandler, true);

        this.canvas.style.cursor = 'move';
    }

    private stopTracking(): void {
        this.canvas.removeEventListener('canvas.moved', this.trackingMouseMoveEventHandler, true);
        this.content.removeEventListener('mousedown', this.trackingMouseClickEventHandler, true);

        if (this.trackingElement.trackrect) {
            this.trackingElement.trackrect.remove();
            this.trackingElement.trackrect = null;
        }

        this.canvas.style.cursor = '';
    }
    // ISL END

    // ISL MAGNIFYING GLASS
    private magnifyingGlassParameters = {
        cursorX: 0,
        cursorY: 0,
        resizePointID: '',
        resizeRectID: '',
        zoomScale: 100
    }

    private updateMagnifyingGlass(): void {
        const [mgX, mgY] = translateToSVG(this.magnifyingGlassContainer, [this.magnifyingGlassParameters.cursorX, this.magnifyingGlassParameters.cursorY]); //convert coordinates to SVG coordinates
        const width = this.magnifyingGlassImage.width;
        const height = this.magnifyingGlassImage.height;
        const point = window.document.getElementById(this.magnifyingGlassParameters.resizePointID);
        const activeRect = window.document.getElementById(this.magnifyingGlassParameters.resizeRectID);
        const rectbbox = (activeRect as any).getBBox();

        const mgCtx = this.magnifyingGlassImage.getContext('2d');
        //const [cX, cY] = translateToSVG(this.content, [this.magnifyingGlassParameters.cursorX, this.magnifyingGlassParameters.cursorY]);
        //const bgX = cX - this.geometry.offset;
        //const bgY = cY - this.geometry.offset;

        const theta = Math.atan2((point.getAttribute('cy') as any) - (rectbbox.height / 2 as any), (point.getAttribute('cx') as any) - (rectbbox.width / 2 as any));
        const rad = Math.sqrt((width * width) + (height * height)) / 2;

        // move magnifying glass
        this.border.setAttributeNS(null, 'cx', `${mgX + (rad * Math.cos(theta))}`);
        this.border.setAttributeNS(null, 'cy', `${mgY + (rad * Math.sin(theta))}`);
        this.magnifyingGlassForeignObject.setAttribute('x', `${mgX - width / 2 + (rad * Math.cos(theta))}`);
        this.magnifyingGlassForeignObject.setAttribute('y', `${mgY - height / 2 + (rad * Math.sin(theta))}`);

        const rX = parseInt(activeRect.getAttribute('x')) - this.geometry.offset;
        const rY = parseInt(activeRect.getAttribute('y')) - this.geometry.offset;
        const ptX = parseInt(point.getAttribute('cx')) + rX;
        const ptY = parseInt(point.getAttribute('cy')) + rY;

        // draw zoom
        mgCtx.fillStyle = "#FFFFFF";
        mgCtx.fillRect(0, 0, width, height);
        // mgCtx.drawImage(this.background,
        //     ptX - (width / 2) * (this.magnifyingGlassParameters.zoomScale / 100),
        //     ptY - (height / 2) * (this.magnifyingGlassParameters.zoomScale / 100),
        //     (width) * (this.magnifyingGlassParameters.zoomScale / 100),
        //     (height) * (this.magnifyingGlassParameters.zoomScale / 100),
        //     0,
        //     0,
        //     width,
        //     height);

        // ISL NEW MAGNIFYING GLASS
        const { offset } = this.controller.geometry;
        const [offsetX,offsetY] = translateToSVG(this.content, [this.magnifyingGlassParameters.cursorX, this.magnifyingGlassParameters.cursorY]);
        var mouseCoordsX = offsetX - offset;
        var mousecoordsY = offsetY - offset;

        //console.log(mouseCoordsX, mousecoordsY);
        mgCtx.drawImage(this.background,mouseCoordsX - (width/this.fixedZoomMultiplier)/2,mousecoordsY - (height/this.fixedZoomMultiplier)/2,
            width/this.fixedZoomMultiplier, height/this.fixedZoomMultiplier, 0, 0,width,height);
        // ISL END

        // draw crosshair
        mgCtx.strokeStyle = "red";
        mgCtx.moveTo(width / 2, 0);
        mgCtx.lineTo(width / 2, height);
        mgCtx.stroke();
        mgCtx.moveTo(0, height / 2);
        mgCtx.lineTo(width, height / 2);
        mgCtx.stroke();
    }
    // ISL END

    // ISL BACKGROUND FILTER
    private getFilteredBG(): void {
        var ctx = this.background.getContext("2d");
        this.backgroundOriginal = ctx.getImageData(0, 0, this.background.width, this.background.height);
        this.backgroundNew = new ImageData(
            new Uint8ClampedArray(this.backgroundOriginal.data),
            this.backgroundOriginal.width,
            this.backgroundOriginal.height
        )
        for (var index = 0; index < this.backgroundOriginal.data.length; index += 4) {
            this.backgroundNew.data[index] = 0;
        }
        ctx = null;
    }

    private focusBox(focusedBox: any): void {
        if (focusedBox == true) {
            if (this.lastShapeClicked == this.activeElement.clientID && this.lastShapeClicked != null) {
                var ctx = this.background.getContext("2d");
                var pointsBBox = this.drawnStates[this.activeElement.clientID].points;
                ctx.putImageData(this.backgroundNew, 0, 0);
                ctx.putImageData(this.backgroundOriginal, 0, 0, pointsBBox[0], pointsBBox[1], pointsBBox[2] - pointsBBox[0], pointsBBox[3] - pointsBBox[1]);
                pointsBBox = null;
                ctx = null;
            }
        }
        else if (focusedBox == false && this.lastShapeClicked != null) {
            var ctx = this.background.getContext("2d");
            ctx.putImageData(this.backgroundOriginal, 0, 0);
            ctx = null;
        };
    }
    // ISL END

    // ISL LOCKED ICON
    private lockedBox(focusedBox: any): void {
        if (focusedBox == true) {
            if (this.lastShapeHighlighted && this.lastShapeClicked != null) {
                var ctx = this.background.getContext("2d");
                var pointsBBox = this.drawnStates[this.lastShapeHighlighted].points;
                ctx.putImageData(this.backgroundNew, 0, 0);
                ctx.putImageData(this.backgroundOriginal, 0, 0, pointsBBox[0], pointsBBox[1], pointsBBox[2] - pointsBBox[0], pointsBBox[3] - pointsBBox[1]);
                pointsBBox = null;
                ctx = null;
            }
        }
        else if (focusedBox == false && this.lastShapeClicked != null) {
            var ctx = this.background.getContext("2d");
            ctx.putImageData(this.backgroundOriginal, 0, 0);
            ctx = null;
        };
    }
    // ISL END
    private redrawBitmap(): void {
        const width = +this.background.style.width.slice(0, -2);
        const height = +this.background.style.height.slice(0, -2);
        this.bitmap.setAttribute('width', `${width}px`);
        this.bitmap.setAttribute('height', `${height}px`);
        const states = this.controller.objects;

        const ctx = this.bitmap.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, width, height);
            for (const state of states) {
                if (state.hidden || state.outside) continue;
                ctx.fillStyle = 'white';
                if (['rectangle', 'polygon', 'cuboid'].includes(state.shapeType)) {
                    let points = [];
                    if (state.shapeType === 'rectangle') {
                        points = [
                            state.points[0], // xtl
                            state.points[1], // ytl
                            state.points[2], // xbr
                            state.points[1], // ytl
                            state.points[2], // xbr
                            state.points[3], // ybr
                            state.points[0], // xtl
                            state.points[3], // ybr
                        ];
                    } else if (state.shapeType === 'cuboid') {
                        points = [
                            state.points[0],
                            state.points[1],
                            state.points[4],
                            state.points[5],
                            state.points[8],
                            state.points[9],
                            state.points[12],
                            state.points[13],
                        ];
                    } else {
                        points = [...state.points];
                    }
                    ctx.beginPath();
                    ctx.moveTo(points[0], points[1]);
                    for (let i = 0; i < points.length; i += 2) {
                        ctx.lineTo(points[i], points[i + 1]);
                    }
                    ctx.closePath();
                    ctx.fill();
                }

                if (state.shapeType === 'cuboid') {
                    for (let i = 0; i < 5; i++) {
                        const points = [
                            state.points[(0 + i * 4) % 16],
                            state.points[(1 + i * 4) % 16],
                            state.points[(2 + i * 4) % 16],
                            state.points[(3 + i * 4) % 16],
                            state.points[(6 + i * 4) % 16],
                            state.points[(7 + i * 4) % 16],
                            state.points[(4 + i * 4) % 16],
                            state.points[(5 + i * 4) % 16],
                        ];
                        ctx.beginPath();
                        ctx.moveTo(points[0], points[1]);
                        for (let j = 0; j < points.length; j += 2) {
                            ctx.lineTo(points[j], points[j + 1]);
                        }
                        ctx.closePath();
                        ctx.fill();
                    }
                }
            }
        }
    }

    private saveState(state: any): void {
        this.drawnStates[state.clientID] = {
            clientID: state.clientID,
            outside: state.outside,
            occluded: state.occluded,
            hidden: state.hidden,
            lock: state.lock,
            shapeType: state.shapeType,
            points: [...state.points],
            attributes: { ...state.attributes },
            zOrder: state.zOrder,
            pinned: state.pinned,
            updated: state.updated,
            frame: state.frame,
            label: state.label,
        };
    }

    private updateObjects(states: any[], translate: (points: number[]) => number[]): void {
        for (const state of states) {
            const { clientID } = state;
            const drawnState = this.drawnStates[clientID];
            const shape = this.svgShapes[state.clientID];
            const text = this.svgTexts[state.clientID];
            const isInvisible = state.hidden || state.outside
                || this.isServiceHidden(state.clientID);

            if (drawnState.hidden !== state.hidden || drawnState.outside !== state.outside) {
                if (isInvisible) {
                    (state.shapeType === 'points' ? shape.remember('_selectHandler').nested : shape)
                        .style('display', 'none');
                    if (text) {
                        text.addClass('cvat_canvas_hidden');
                    }
                } else {
                    (state.shapeType === 'points' ? shape.remember('_selectHandler').nested : shape)
                        .style('display', '');
                    if (text) {
                        text.removeClass('cvat_canvas_hidden');
                        this.updateTextPosition(
                            text,
                            shape,
                        );
                    }
                }
            }

            if (drawnState.zOrder !== state.zOrder) {
                if (state.shapeType === 'points') {
                    shape.remember('_selectHandler').nested
                        .attr('data-z-order', state.zOrder);
                } else {
                    shape.attr('data-z-order', state.zOrder);
                }
            }

            if (drawnState.occluded !== state.occluded) {
                if (state.occluded) {
                    shape.addClass('cvat_canvas_shape_occluded');
                } else {
                    shape.removeClass('cvat_canvas_shape_occluded');
                }
            }

            if (drawnState.pinned !== state.pinned && this.activeElement.clientID !== null) {
                const activeElement = { ...this.activeElement };
                this.deactivate();
                this.activate(activeElement);
            }

            if (state.points.length !== drawnState.points.length || state.points
                .some((p: number, id: number): boolean => p !== drawnState.points[id])
            ) {
                const translatedPoints: number[] = translate(state.points);

                if (state.shapeType === 'rectangle') {
                    const [xtl, ytl, xbr, ybr] = translatedPoints;

                    shape.attr({
                        x: xtl,
                        y: ytl,
                        width: xbr - xtl,
                        height: ybr - ytl,
                    });
                } else {
                    const stringified = translatedPoints.reduce(
                        (acc: string, val: number, idx: number): string => {
                            if (idx % 2) {
                                return `${acc}${val} `;
                            }

                            return `${acc}${val},`;
                        }, '',
                    );
                    if (state.shapeType !== 'cuboid') {
                        (shape as any).clear();
                    }
                    shape.attr('points', stringified);

                    if (state.shapeType === 'points' && !state.hidden) {
                        this.selectize(false, this.svgShapes[clientID]);
                        this.setupPoints(this.svgShapes[clientID] as SVG.PolyLine, state);
                    }
                }
            }

            for (const attrID of Object.keys(state.attributes)) {
                if (state.attributes[attrID] !== drawnState.attributes[+attrID]) {
                    if (text) {
                        const [span] = text.node
                            .querySelectorAll(`[attrID="${attrID}"]`) as any as SVGTSpanElement[];
                        if (span && span.textContent) {
                            const prefix = span.textContent.split(':').slice(0, -1).join(':');
                            span.textContent = `${prefix}: ${state.attributes[attrID]}`;
                        }
                    }
                }
            }

            this.saveState(state);
        }
    }

    private addObjects(states: any[], translate: (points: number[]) => number[]): void {
        const { displayAllText } = this.configuration;

        for (const state of states) {
            const points: number[] = (state.points as number[]);
            const translatedPoints: number[] = translate(points);

            // TODO: Use enums after typification cvat-core
            if (state.shapeType === 'rectangle') {
                this.svgShapes[state.clientID] = this
                    .addRect(translatedPoints, state);
            } else {
                const stringified = translatedPoints.reduce(
                    (acc: string, val: number, idx: number): string => {
                        if (idx % 2) {
                            return `${acc}${val} `;
                        }

                        return `${acc}${val},`;
                    }, '',
                );

                if (state.shapeType === 'polygon') {
                    this.svgShapes[state.clientID] = this
                        .addPolygon(stringified, state);
                } else if (state.shapeType === 'polyline') {
                    this.svgShapes[state.clientID] = this
                        .addPolyline(stringified, state);
                } else if (state.shapeType === 'points') {
                    this.svgShapes[state.clientID] = this
                        .addPoints(stringified, state);
                } else if (state.shapeType === 'cuboid') {
                    this.svgShapes[state.clientID] = this
                        .addCuboid(stringified, state);
                } else {
                    continue;
                }
            }

                this.svgShapes[state.clientID].on('click.canvas', (): void => {
                    this.canvas.dispatchEvent(new CustomEvent('canvas.clicked', {
                        bubbles: false,
                        cancelable: true,
                        detail: {
                            state,
                        },
                    }));
                });
                // ISL AUTOFIT
                this.svgShapes[state.clientID].on('dblclick.canvas', (e: any): void => {
                    e.stopPropagation();
                    this.canvas.dispatchEvent(new CustomEvent('canvas.dblclicked', {
                        bubbles: false,
                        cancelable: true,
                        detail: {
                            state,
                        },
                    }));
                });
                // ISL END

            if (displayAllText) {
                this.svgTexts[state.clientID] = this.addText(state);
                this.updateTextPosition(
                    this.svgTexts[state.clientID],
                    this.svgShapes[state.clientID],
                );
            }

            this.saveState(state);
        }
    }

    private sortObjects(): void {
        // TODO: Can be significantly optimized
        const states = Array.from(
            this.content.getElementsByClassName('cvat_canvas_shape'),
        ).map((state: SVGElement): [SVGElement, number] => (
            [state, +state.getAttribute('data-z-order')]
        ));

        const needSort = states.some((pair): boolean => pair[1] !== states[0][1]);
        if (!states.length || !needSort) {
            return;
        }

        const sorted = states.sort((a, b): number => a[1] - b[1]);
        sorted.forEach((pair): void => {
            this.content.appendChild(pair[0]);
        });

        this.content.prepend(...sorted.map((pair): SVGElement => pair[0]));
    }

    private deactivateAttribute(): void {
        const { clientID, attributeID } = this.activeElement;
        if (clientID !== null && attributeID !== null) {
            const text = this.svgTexts[clientID];
            if (text) {
                const [span] = text.node
                    .querySelectorAll(`[attrID="${attributeID}"]`) as any as SVGTSpanElement[];
                if (span) {
                    span.style.fill = '';
                }
            }

            this.activeElement = {
                ...this.activeElement,
                attributeID: null,
            };
        }
    }

    private deactivateShape(): void {

        if (this.activeElement.clientID !== null) {
            console.log('deactivate');
            const { displayAllText } = this.configuration;
            const { clientID } = this.activeElement;
            const drawnState = this.drawnStates[clientID];
            const shape = this.svgShapes[clientID];
            const [state] = this.controller.objects
            .filter((_state: any): boolean => _state.clientID === clientID);
            shape.removeClass('cvat_canvas_shape_activated');
            shape.removeClass('cvat_canvas_shape_draggable');
            // if (!state.lock) {
            //     (shape as any).on('mouseout', (): void => {
            //     // ISL LOCK ICON
            //     console.log('testoff');
            //     this.lastShapeClicked = clientID;
            //     this.lockedBox(false);
            //     return;
            //     })
            // }
            if(state.lock) {
                console.log('mouse off state.lcok');
            }
            if (!drawnState.pinned) {
                (shape as any).off('dragstart');
                (shape as any).off('dragend');
                (shape as any).draggable(false);
            }

            if (drawnState.shapeType !== 'points') {
                this.selectize(false, shape);
            }

            if (drawnState.shapeType === 'cuboid') {
                (shape as any).attr('projections', false);
            }

            (shape as any).off('resizestart');
            (shape as any).off('resizing');
            (shape as any).off('resizedone');
            (shape as any).resize('stop');

            // TODO: Hide text only if it is hidden by settings
            const text = this.svgTexts[clientID];
            if (text && !displayAllText) {
                text.remove();
                delete this.svgTexts[clientID];
            }

            this.sortObjects();

            this.activeElement = {
                ...this.activeElement,
                clientID: null,
            };
        }
    }

    private deactivate(): void {
        this.deactivateAttribute();
        this.deactivateShape();
    }

    private activateAttribute(clientID: number, attributeID: number): void {
        const text = this.svgTexts[clientID];
        if (text) {
            const [span] = text.node
                .querySelectorAll(`[attrID="${attributeID}"]`) as any as SVGTSpanElement[];
            if (span) {
                span.style.fill = 'red';
            }

            this.activeElement = {
                ...this.activeElement,
                attributeID,
            };
        }
    }

    private activateShape(clientID: number): void {
        console.log('activate');
        const [state] = this.controller.objects
            .filter((_state: any): boolean => _state.clientID === clientID);

        if (state && state.shapeType === 'points') {
            this.svgShapes[clientID].remember('_selectHandler').nested
                .style('pointer-events', state.lock ? 'none' : '');
        }

        if (!state || state.hidden || state.outside) {
            return;
        }

        const shape = this.svgShapes[clientID];

        if (state.lock) {
            // (shape as any).on('mouseover', (): void => {
            // // ISL LOCK ICON
            // console.log('test');
            // this.lastShapeClicked = clientID;
            // this.lockedBox(true);
            // return;
            // })
            console.log('state.lock activate');
            return;
        }

        shape.addClass('cvat_canvas_shape_activated');
        if (state.shapeType === 'points') {
            this.content.append(this.svgShapes[clientID]
                .remember('_selectHandler').nested.node);
        } else {
            this.content.append(shape.node);
        }

        // ISL BACKGROUND FILTER
        (shape as any).on('click', (): void => {
            if (this.lastShapeClicked != clientID) {
                this.lastShapeClicked = clientID;
                this.focusBox(true);
            }
        })
        // EDITED END
        const { showProjections } = this.configuration;
        if (state.shapeType === 'cuboid' && showProjections) {
            (shape as any).attr('projections', true);
        }

        let text = this.svgTexts[clientID];
        if (!text) {
            text = this.addText(state);
            this.svgTexts[state.clientID] = text;
        }

        const hideText = (): void => {
            if (text) {
                text.addClass('cvat_canvas_hidden');
            }
        };

        const showText = (): void => {
            if (text) {
                text.removeClass('cvat_canvas_hidden');
                this.updateTextPosition(text, shape);
            }
        };

        if (!state.pinned) {
            shape.addClass('cvat_canvas_shape_draggable');
            (shape as any).draggable().on('dragstart', (): void => {
                this.mode = Mode.DRAG;
                // ISL BACKGROUND FILTER
                this.focusBox(false);
                // EDITED END

                hideText();
                // ISL END

            }).on('dragend', (e: CustomEvent): void => {
                showText();
                this.mode = Mode.IDLE;
                const p1 = e.detail.handler.startPoints.point;
                const p2 = e.detail.p;
                const delta = 1;
                const { offset } = this.controller.geometry;
                if (Math.sqrt(((p1.x - p2.x) ** 2) + ((p1.y - p2.y) ** 2)) >= delta) {
                    const points = pointsToNumberArray(
                        shape.attr('points') || `${shape.attr('x')},${shape.attr('y')} `
                        + `${shape.attr('x') + shape.attr('width')},`
                        + `${shape.attr('y') + shape.attr('height')}`,
                    ).map((x: number): number => x - offset);

                    this.drawnStates[state.clientID].points = points;
                    this.canvas.dispatchEvent(new CustomEvent('canvas.dragshape', {
                        bubbles: false,
                        cancelable: true,
                        detail: {
                            id: state.clientID,
                        },
                    }));
                    this.onEditDone(state, points);
                }
                // ISL BACKGROUND FILTER
                this.focusBox(true);
                // ISL END
            });
        }

        if (state.shapeType !== 'points') {
            this.selectize(true, shape);
        }

        const showDirection = (): void => {
            if (['polygon', 'polyline'].includes(state.shapeType)) {
                this.showDirection(state, shape as SVG.Polygon | SVG.PolyLine);
            }
        };

        const hideDirection = (): void => {
            if (['polygon', 'polyline'].includes(state.shapeType)) {
                this.hideDirection(shape as SVG.Polygon | SVG.PolyLine);
            }
        };

        showDirection();

        let shapeSizeElement: ShapeSizeElement | null = null;
        let resized = false;
        (shape as any).resize({
            snapToGrid: 0.1,
        }).on('resizestart', (): void => {
            this.mode = Mode.RESIZE;
            // ISL BACKGROUND FILTER
            this.focusBox(false);
            // ISL END
            if (state.shapeType === 'rectangle') {
                shapeSizeElement = displayShapeSize(this.adoptedContent, this.adoptedText);
            }
            resized = false;


            // ISL MAGNIFYING GLASS
            this.magnifyingGlassParameters.resizePointID = window.document.getElementsByClassName('cvat_canvas_selected_point')[0].id
            this.magnifyingGlassParameters.resizeRectID = window.document.getElementsByClassName('cvat_canvas_shape_activated')[0].id
            this.magnifyingGlassContainer.classList.remove('cvat_canvas_hidden');
            this.updateMagnifyingGlass()
            // ISL END

            resized = false;
            hideDirection();
            hideText();
            if (state.shapeType === 'rectangle') {
                shapeSizeElement = displayShapeSize(this.adoptedContent, this.adoptedText);
            }

        }).on('resizing', (): void => {
            resized = true;
            if (shapeSizeElement) {
                shapeSizeElement.update(shape);
            }
        }).on('resizedone', (): void => {
            if (shapeSizeElement) {
                shapeSizeElement.rm();
            }

            showDirection();
            showText();

            this.mode = Mode.IDLE;

            if (resized) {
                const { offset } = this.controller.geometry;

                const points = pointsToNumberArray(
                    shape.attr('points') || `${shape.attr('x')},${shape.attr('y')} `
                    + `${shape.attr('x') + shape.attr('width')},`
                    + `${shape.attr('y') + shape.attr('height')}`,
                ).map((x: number): number => x - offset);

                this.drawnStates[state.clientID].points = points;
                this.canvas.dispatchEvent(new CustomEvent('canvas.resizeshape', {
                    bubbles: false,
                    cancelable: true,
                    detail: {
                        id: state.clientID,
                    },
                }));
                this.onEditDone(state, points);
            }
            // ISL BACKGROUND FILTER
            this.magnifyingGlassContainer.classList.add('cvat_canvas_hidden');
            this.focusBox(true);
            // ISL END
        });

        this.activeElement = {
            ...this.activeElement,
            clientID,
        };

        this.updateTextPosition(text, shape);
        this.canvas.dispatchEvent(new CustomEvent('canvas.activated', {
            bubbles: false,
            cancelable: true,
            detail: {
                state,
            },
        }));
    }

    private activate(activeElement: ActiveElement): void {
        // Check if another element have been already activated
        if (this.activeElement.clientID !== null) {
            if (this.activeElement.clientID !== activeElement.clientID) {
                // Deactivate previous shape and attribute
                this.deactivate();
            } else if (this.activeElement.attributeID !== activeElement.attributeID) {
                this.deactivateAttribute();
            }
        }

        const { clientID, attributeID } = activeElement;
        if (clientID !== null && this.activeElement.clientID !== clientID) {
            this.activateShape(clientID);
        }

        if (clientID !== null
            && attributeID !== null
            && this.activeElement.attributeID !== attributeID
        ) {
            this.activateAttribute(clientID, attributeID);
        }
    }

    // Update text position after corresponding box has been moved, resized, etc.
    private updateTextPosition(text: SVG.Text, shape: SVG.Shape): void {
        if (text.node.style.display === 'none') return; // wrong transformation matrix
        let box = (shape.node as any).getBBox();

        // Translate the whole box to the client coordinate system
        const [x1, y1, x2, y2]: number[] = translateFromSVG(this.content, [
            box.x,
            box.y,
            box.x + box.width,
            box.y + box.height,
        ]);

        box = {
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            width: Math.max(x1, x2) - Math.min(x1, x2),
            height: Math.max(y1, y2) - Math.min(y1, y2),
        };

        // Find the best place for a text
        let [clientX, clientY]: number[] = [box.x, box.y];
        // if (clientX + (text.node as any as SVGTextElement)
        //     .getBBox().width + consts.TEXT_MARGIN > this.canvas.offsetWidth) {
        //     ([clientX, clientY] = [box.x, box.y]);
        // }

        // Translate back to text SVG
        const [x, y]: number[] = translateToSVG(this.text, [
            clientX,
            clientY,
        ]);

        // Finally draw a text
        text.move(x, y);
        for (const tspan of (text.lines() as any).members) {
            tspan.attr('x', text.attr('x'));
        }
    }

    private addText(state: any): SVG.Text {
        const { undefinedAttrValue } = this.configuration;
        const { label, clientID, attributes } = state;
        const attrNames = label.attributes.reduce((acc: any, val: any): void => {
            acc[val.id] = val.name;
            return acc;
        }, {});

        return this.adoptedText.text((block): void => {
            block.tspan(`${label.name} ${clientID}`).style('text-transform', 'uppercase');
            for (const attrID of Object.keys(attributes)) {
                const value = attributes[attrID] === undefinedAttrValue
                    ? '' : attributes[attrID];
                block.tspan(`${attrNames[attrID]}: ${value}`).attr({
                    attrID,
                    dy: '1em',
                    x: 0,
                });
            }
        }).move(0, 0).addClass('cvat_canvas_text');
    }

    private addRect(points: number[], state: any): SVG.Rect {
        const [xtl, ytl, xbr, ybr] = points;
        const rect = this.adoptedContent.rect().size(xbr - xtl, ybr - ytl).attr({
            clientID: state.clientID,
            'color-rendering': 'optimizeQuality',
            id: `cvat_canvas_shape_${state.clientID}`,
            fill: state.color,
            'shape-rendering': 'geometricprecision',
            stroke: state.color,
            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            'data-z-order': state.zOrder,
        }).move(xtl, ytl)
            .addClass('cvat_canvas_shape');

        if (state.occluded) {
            rect.addClass('cvat_canvas_shape_occluded');
        }

        if (state.hidden || state.outside || this.isServiceHidden(state.clientID)) {
            rect.addClass('cvat_canvas_hidden');
        }

        return rect;
    }

    private addPolygon(points: string, state: any): SVG.Polygon {
        const polygon = this.adoptedContent.polygon(points).attr({
            clientID: state.clientID,
            'color-rendering': 'optimizeQuality',
            id: `cvat_canvas_shape_${state.clientID}`,
            fill: state.color,
            'shape-rendering': 'geometricprecision',
            stroke: state.color,
            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            'data-z-order': state.zOrder,
        }).addClass('cvat_canvas_shape');

        if (state.occluded) {
            polygon.addClass('cvat_canvas_shape_occluded');
        }

        if (state.hidden || state.outside || this.isServiceHidden(state.clientID)) {
            polygon.addClass('cvat_canvas_hidden');
        }

        return polygon;
    }

    private addPolyline(points: string, state: any): SVG.PolyLine {
        const polyline = this.adoptedContent.polyline(points).attr({
            clientID: state.clientID,
            'color-rendering': 'optimizeQuality',
            id: `cvat_canvas_shape_${state.clientID}`,
            fill: state.color,
            'shape-rendering': 'geometricprecision',
            stroke: state.color,
            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            'data-z-order': state.zOrder,
        }).addClass('cvat_canvas_shape');

        if (state.occluded) {
            polyline.addClass('cvat_canvas_shape_occluded');
        }

        if (state.hidden || state.outside || this.isServiceHidden(state.clientID)) {
            polyline.addClass('cvat_canvas_hidden');
        }

        return polyline;
    }

    private addCuboid(points: string, state: any): any {
        const cube = (this.adoptedContent as any).cube(points)
            .fill(state.color).attr({
                clientID: state.clientID,
                'color-rendering': 'optimizeQuality',
                id: `cvat_canvas_shape_${state.clientID}`,
                fill: state.color,
                'shape-rendering': 'geometricprecision',
                stroke: state.color,
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'data-z-order': state.zOrder,
            }).addClass('cvat_canvas_shape');

        if (state.occluded) {
            cube.addClass('cvat_canvas_shape_occluded');
        }

        if (state.hidden || state.outside || this.isServiceHidden(state.clientID)) {
            cube.addClass('cvat_canvas_hidden');
        }

        return cube;
    }

    private setupPoints(basicPolyline: SVG.PolyLine, state: any): any {
        this.selectize(true, basicPolyline);

        const group: SVG.G = basicPolyline.remember('_selectHandler').nested
            .addClass('cvat_canvas_shape').attr({
                clientID: state.clientID,
                id: `cvat_canvas_shape_${state.clientID}`,
                'data-polyline-id': basicPolyline.attr('id'),
                'data-z-order': state.zOrder,
            });

        group.on('click.canvas', (event: MouseEvent): void => {
            // Need to redispatch the event on another element
            basicPolyline.fire(new MouseEvent('click', event));
            // redispatch event to canvas to be able merge points clicking them
            this.content.dispatchEvent(new MouseEvent('click', event));
        });

        group.bbox = basicPolyline.bbox.bind(basicPolyline);
        group.clone = basicPolyline.clone.bind(basicPolyline);

        return group;
    }

    private addPoints(points: string, state: any): SVG.PolyLine {
        const shape = this.adoptedContent.polyline(points).attr({
            'color-rendering': 'optimizeQuality',
            'pointer-events': 'none',
            'shape-rendering': 'geometricprecision',
            'stroke-width': 0,
            fill: state.color, // to right fill property when call SVG.Shape::clone()
        }).style({
            opacity: 0,
        });

        const group = this.setupPoints(shape, state);

        if (state.hidden || state.outside || this.isServiceHidden(state.clientID)) {
            group.addClass('cvat_canvas_hidden');
        }

        shape.remove = (): SVG.PolyLine => {
            this.selectize(false, shape);
            shape.constructor.prototype.remove.call(shape);
            return shape;
        };

        return shape;
    }
}
