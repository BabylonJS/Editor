import { Component, ReactNode, PointerEvent } from "react";
import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../../ui/shadcn/ui/dropdown-menu";
import { HiOutlineArrowPath } from "react-icons/hi2";
import { Button } from "../../../../ui/shadcn/ui/button";
import type { FunctionEditorValue } from "./function";

export interface IBezierCurve {
	p0: number;
	p1: number;
	p2: number;
	p3: number;
	start: number;
}

export interface IBezierEditorProps {
	value: FunctionEditorValue | null | undefined;
	onChange: () => void;
}

export interface IBezierEditorState {
	curve: IBezierCurve;
	dragging: boolean;
	dragPoint: "p0" | "p1" | "p2" | "p3" | null;
	hoveredPoint: "p0" | "p1" | "p2" | "p3" | null;
	width: number;
	height: number;
}

type CurvePreset = "linear" | "easeIn" | "easeOut" | "easeInOut" | "easeInBack" | "easeOutBack";

const CURVE_PRESETS: Record<CurvePreset, IBezierCurve> = {
	linear: { p0: 0, p1: 0, p2: 1, p3: 1, start: 0 },
	easeIn: { p0: 0, p1: 0.42, p2: 1, p3: 1, start: 0 },
	easeOut: { p0: 0, p1: 0, p2: 0.58, p3: 1, start: 0 },
	easeInOut: { p0: 0, p1: 0.42, p2: 0.58, p3: 1, start: 0 },
	easeInBack: { p0: 0, p1: -0.36, p2: 0.36, p3: 1, start: 0 },
	easeOutBack: { p0: 0, p1: 0.64, p2: 1.36, p3: 1, start: 0 },
};

export class BezierEditor extends Component<IBezierEditorProps, IBezierEditorState> {
	private static _gradientIdSeq = 0;

	private readonly _fillGradientId = `bezier-editor-fill-${BezierEditor._gradientIdSeq++}`;

	private _svgRef: SVGSVGElement | null = null;
	private _containerRef: HTMLDivElement | null = null;

	/** Synchronous drag target so pointermove runs before dragging state is committed in React. */
	private _activeDragPoint: "p0" | "p1" | "p2" | "p3" | null = null;

	public constructor(props: IBezierEditorProps) {
		super(props);
		this.state = {
			curve: this._getCurveFromValue(),
			dragging: false,
			dragPoint: null,
			hoveredPoint: null,
			width: 400,
			height: 250,
		};
	}

	public componentDidMount(): void {
		this._updateDimensions();
		window.addEventListener("resize", this._updateDimensions);
	}

	public componentWillUnmount(): void {
		window.removeEventListener("resize", this._updateDimensions);
	}

	private _updateDimensions = (): void => {
		if (this._containerRef) {
			const rect = this._containerRef.getBoundingClientRect();
			this.setState({
				width: Math.max(300, rect.width - 20),
				height: 250,
			});
		}
	};

	private _getCurveFromValue(): IBezierCurve {
		if (!this.props.value || !this.props.value.data) {
			return CURVE_PRESETS.linear;
		}
		const data = this.props.value.data as Record<string, unknown>;
		const fn = data.function as { p0?: number; p1?: number; p2?: number; p3?: number } | undefined;
		if (fn) {
			return {
				p0: fn.p0 ?? 0,
				p1: fn.p1 ?? 1.0 / 3,
				p2: fn.p2 ?? (1.0 / 3) * 2,
				p3: fn.p3 ?? 1,
				start: 0,
			};
		}

		return CURVE_PRESETS.linear;
	}

	private _saveCurveToValue(): void {
		if (!this.props.value) {
			return;
		}

		if (!this.props.value.data) {
			this.props.value.data = {};
		}
		const data = this.props.value.data as Record<string, unknown>;

		// Save as direct function object (not array). Quarks Bezier.genValue uses raw coefficients — no clamp.
		const { p0, p1, p2, p3 } = this.state.curve;
		data.function = {
			p0: Number.isFinite(p0) ? p0 : 0,
			p1: Number.isFinite(p1) ? p1 : 1 / 3,
			p2: Number.isFinite(p2) ? p2 : (1.0 / 3) * 2,
			p3: Number.isFinite(p3) ? p3 : 1,
		};
	}

	/** Keep the same `curve` object reference so EditorInspectorNumberField pointer-drag listeners stay on the mutated object. */
	private _onCurveNumberChange = (): void => {
		this.setState((s) => ({ curve: s.curve }));
		this._saveCurveToValue();
		this.props.onChange();
	};

	private _applyPreset(preset: CurvePreset): void {
		const presetCurve = CURVE_PRESETS[preset];
		this.setState({ curve: { ...presetCurve } }, () => {
			this._saveCurveToValue();
			this.props.onChange();
		});
	}

	private _screenToSvg(clientX: number, clientY: number): { x: number; y: number } {
		if (!this._svgRef) {
			return { x: 0, y: 0 };
		}

		const rect = this._svgRef.getBoundingClientRect();
		const vb = this._svgRef.viewBox?.baseVal;
		if (!vb) {
			return {
				x: clientX - rect.left,
				y: clientY - rect.top,
			};
		}

		const scaleX = rect.width / vb.width;
		const scaleY = rect.height / vb.height;
		const useScale = Math.min(scaleX, scaleY);

		const offsetX = (rect.width - vb.width * useScale) / 2;
		const offsetY = (rect.height - vb.height * useScale) / 2;

		return {
			x: (clientX - rect.left - offsetX) / useScale,
			y: (clientY - rect.top - offsetY) / useScale,
		};
	}

	/** Scalar range mapped to the vertical chart (includes overshoot from control points). */
	private _valueSpan(curve: IBezierCurve): { lo: number; hi: number } {
		const pad = 0.12;
		let lo = Math.min(0, 1, curve.p0, curve.p1, curve.p2, curve.p3) - pad;
		let hi = Math.max(0, 1, curve.p0, curve.p1, curve.p2, curve.p3) + pad;
		const span = hi - lo;
		const minSpan = 0.6;
		if (span < minSpan) {
			const mid = (lo + hi) / 2;
			lo = mid - minSpan / 2;
			hi = mid + minSpan / 2;
		}
		return { lo, hi };
	}

	private _valueToSvgY(value: number, curve: IBezierCurve): number {
		const { lo, hi } = this._valueSpan(curve);
		const padding = this.state.height * 0.1;
		const range = this.state.height * 0.8;
		const t = (value - lo) / (hi - lo);
		return padding + (1 - t) * range;
	}

	private _svgYToValue(svgY: number, curve: IBezierCurve): number {
		const { lo, hi } = this._valueSpan(curve);
		const padding = this.state.height * 0.1;
		const range = this.state.height * 0.8;
		const t = (this.state.height - svgY - padding) / range;
		return lo + t * (hi - lo);
	}

	private _handlePointerDown = (ev: PointerEvent<SVGCircleElement>, point: "p0" | "p1" | "p2" | "p3"): void => {
		ev.preventDefault();
		ev.stopPropagation();
		if (ev.button !== 0) {
			return;
		}

		this._activeDragPoint = point;
		this.setState({
			dragging: true,
			dragPoint: point,
		});
		ev.currentTarget.setPointerCapture(ev.pointerId);
	};

	private _handlePointerMove = (ev: PointerEvent<SVGCircleElement>): void => {
		if (!this._activeDragPoint) {
			return;
		}

		const svgPos = this._screenToSvg(ev.clientX, ev.clientY);
		const value = this._svgYToValue(svgPos.y, this.state.curve);
		const curve = { ...this.state.curve };
		curve[this._activeDragPoint] = value;
		this.setState({ curve });
	};

	private _finishPointerDrag = (ev: PointerEvent<SVGCircleElement>): void => {
		if (!this._activeDragPoint) {
			return;
		}
		this._activeDragPoint = null;
		try {
			ev.currentTarget.releasePointerCapture(ev.pointerId);
		} catch {
			// Capture may already be released.
		}

		this._saveCurveToValue();
		this.props.onChange();

		this.setState({
			dragging: false,
			dragPoint: null,
		});
	};

	private _renderCurve(curve: IBezierCurve): ReactNode {
		const p0X = 0;
		const p0Y = this._valueToSvgY(curve.p0, curve);
		const p1X = this.state.width / 3;
		const p1Y = this._valueToSvgY(curve.p1, curve);
		const p2X = (this.state.width * 2) / 3;
		const p2Y = this._valueToSvgY(curve.p2, curve);
		const p3X = this.state.width;
		const p3Y = this._valueToSvgY(curve.p3, curve);

		const strokePath = `M ${p0X} ${p0Y} C ${p1X} ${p1Y} ${p2X} ${p2Y} ${p3X} ${p3Y}`;
		const fillPath = `${strokePath} L ${this.state.width} ${this.state.height} L 0 ${this.state.height} Z`;

		const isHovered = (point: "p0" | "p1" | "p2" | "p3") => this.state.hoveredPoint === point || this.state.dragPoint === point;
		const pointRadius = (point: "p0" | "p1" | "p2" | "p3") => (point === "p0" || point === "p3" ? 5 : 4);
		const pointColor = (point: "p0" | "p1" | "p2" | "p3") => (point === "p0" || point === "p3" ? "#2563eb" : "#7c3aed");

		return (
			<g>
				<defs>
					<linearGradient id={this._fillGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
						<stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
					</linearGradient>
				</defs>

				{/* Filled area under curve */}
				<path d={fillPath} fill={`url(#${this._fillGradientId})`} />

				{/* Curve line */}
				<path d={strokePath} stroke="#3b82f6" strokeWidth="2.5" fill="none" />

				{/* Control lines */}
				<line x1={p0X} y1={p0Y} x2={p1X} y2={p1Y} stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 2" className="opacity-40" />
				<line x1={p2X} y1={p2Y} x2={p3X} y2={p3Y} stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 2" className="opacity-40" />

				{/* Control points */}
				{(["p0", "p1", "p2", "p3"] as const).map((point) => {
					const x = point === "p0" ? p0X : point === "p1" ? p1X : point === "p2" ? p2X : p3X;
					const y = point === "p0" ? p0Y : point === "p1" ? p1Y : point === "p2" ? p2Y : p3Y;
					const value = curve[point];
					const radius = pointRadius(point);
					const color = pointColor(point);

					return (
						<g key={point}>
							<circle
								cx={x}
								cy={y}
								r={radius}
								fill={color}
								stroke="white"
								strokeWidth="2"
								className="cursor-ns-resize"
								onPointerDown={(e) => this._handlePointerDown(e, point)}
								onPointerMove={this._handlePointerMove}
								onPointerUp={this._finishPointerDrag}
								onPointerCancel={this._finishPointerDrag}
								onPointerEnter={() => this.setState({ hoveredPoint: point })}
								onPointerLeave={() => {
									if (!this._activeDragPoint) {
										this.setState({ hoveredPoint: null });
									}
								}}
							/>
							{/* Value label */}
							{isHovered(point) && (
								<text x={x} y={y - 15} textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="600" className="pointer-events-none select-none">
									{value.toFixed(2)}
								</text>
							)}
						</g>
					);
				})}
			</g>
		);
	}

	private _renderGrid(): ReactNode {
		const gridLines: ReactNode[] = [];
		const curve = this.state.curve;
		const { lo, hi } = this._valueSpan(curve);

		// Horizontal grid lines (value markers)
		for (let i = 0; i <= 10; i++) {
			const value = lo + ((hi - lo) * i) / 10;
			const y = this._valueToSvgY(value, curve);
			const isMainLine = i % 5 === 0;

			gridLines.push(
				<g key={`h-${i}`}>
					<line
						x1="0"
						y1={y}
						x2={this.state.width}
						y2={y}
						stroke="currentColor"
						strokeWidth={isMainLine ? 0.5 : 0.3}
						className={isMainLine ? "opacity-20" : "opacity-10"}
					/>
					{isMainLine && (
						<text x="5" y={y + 4} fill="currentColor" fontSize="10" className="opacity-40 select-none">
							{value.toFixed(1)}
						</text>
					)}
				</g>,
			);
		}

		// Vertical grid lines (time markers)
		for (let i = 0; i <= 10; i++) {
			const t = i / 10;
			const x = t * this.state.width;
			const isMainLine = i % 5 === 0;

			gridLines.push(
				<g key={`v-${i}`}>
					<line
						x1={x}
						y1="0"
						x2={x}
						y2={this.state.height}
						stroke="currentColor"
						strokeWidth={isMainLine ? 0.5 : 0.3}
						className={isMainLine ? "opacity-20" : "opacity-10"}
					/>
					{isMainLine && (
						<text x={x} y={this.state.height - 5} textAnchor="middle" fill="currentColor" fontSize="10" className="opacity-40 select-none">
							{t.toFixed(1)}
						</text>
					)}
				</g>
			);
		}

		// Reference line at scalar 0.5 when visible in the current span
		if (0.5 > lo && 0.5 < hi) {
			gridLines.push(
				<line
					key="center"
					x1="0"
					y1={this._valueToSvgY(0.5, curve)}
					x2={this.state.width}
					y2={this._valueToSvgY(0.5, curve)}
					stroke="currentColor"
					strokeWidth="1"
					className="opacity-30"
					strokeDasharray="2 2"
				/>,
			);
		}

		return <g>{gridLines}</g>;
	}

	public render(): ReactNode {
		return (
			<div ref={(ref) => (this._containerRef = ref)} className="flex flex-col gap-3 w-full">
				{/* Toolbar */}
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium">Curve Editor</span>
					</div>
					<div className="flex items-center gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm" className="h-7 text-xs">
									Presets
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => this._applyPreset("linear")}>Linear</DropdownMenuItem>
								<DropdownMenuItem onClick={() => this._applyPreset("easeIn")}>Ease In</DropdownMenuItem>
								<DropdownMenuItem onClick={() => this._applyPreset("easeOut")}>Ease Out</DropdownMenuItem>
								<DropdownMenuItem onClick={() => this._applyPreset("easeInOut")}>Ease In-Out</DropdownMenuItem>
								<DropdownMenuItem onClick={() => this._applyPreset("easeInBack")}>Ease In Back</DropdownMenuItem>
								<DropdownMenuItem onClick={() => this._applyPreset("easeOutBack")}>Ease Out Back</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => this._applyPreset("linear")} title="Reset to Linear">
							<HiOutlineArrowPath className="w-4 h-4" />
						</Button>
					</div>
				</div>

				{/* SVG Canvas */}
				<div className="relative w-full border rounded-lg overflow-hidden bg-background">
					<svg
						ref={(ref) => (this._svgRef = ref)}
						width={this.state.width}
						height={this.state.height}
						viewBox={`0 0 ${this.state.width} ${this.state.height}`}
						className="w-full h-full touch-none"
						style={{ background: "var(--background)", touchAction: "none" }}
					>
						{/* Grid */}
						{this._renderGrid()}

						{/* Curve */}
						{this._renderCurve(this.state.curve)}
					</svg>

					{/* Axis labels */}
					<div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground select-none">Time</div>
					<div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-muted-foreground select-none">Value</div>
				</div>

				{/* Value inputs */}
				<EditorInspectorBlockField>
					<div className="grid grid-cols-4 gap-2">
						<div className="flex flex-col gap-1">
							<label className="text-xs text-muted-foreground">Start (P0)</label>
							<EditorInspectorNumberField
								object={this.state.curve}
								property="p0"
								label=""
								step={0.01}
								onChange={this._onCurveNumberChange}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-xs text-muted-foreground">Control 1 (P1)</label>
							<EditorInspectorNumberField
								object={this.state.curve}
								property="p1"
								label=""
								step={0.01}
								onChange={this._onCurveNumberChange}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-xs text-muted-foreground">Control 2 (P2)</label>
							<EditorInspectorNumberField
								object={this.state.curve}
								property="p2"
								label=""
								step={0.01}
								onChange={this._onCurveNumberChange}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-xs text-muted-foreground">End (P3)</label>
							<EditorInspectorNumberField
								object={this.state.curve}
								property="p3"
								label=""
								step={0.01}
								onChange={this._onCurveNumberChange}
							/>
						</div>
					</div>
				</EditorInspectorBlockField>
			</div>
		);
	}
}
