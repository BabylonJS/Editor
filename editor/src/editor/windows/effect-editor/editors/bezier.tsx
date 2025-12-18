import { Component, ReactNode, MouseEvent } from "react";
import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../../ui/shadcn/ui/dropdown-menu";
import { HiOutlineArrowPath } from "react-icons/hi2";
import { Button } from "../../../../ui/shadcn/ui/button";

export interface IBezierCurve {
	p0: number;
	p1: number;
	p2: number;
	p3: number;
	start: number;
}

export interface IBezierEditorProps {
	value: any;
	onChange: () => void;
}

export interface IBezierEditorState {
	curve: IBezierCurve;
	dragging: boolean;
	dragPoint: "p0" | "p1" | "p2" | "p3" | null;
	hoveredPoint: "p0" | "p1" | "p2" | "p3" | null;
	width: number;
	height: number;
	showValues: boolean;
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
	private _svgRef: SVGSVGElement | null = null;
	private _containerRef: HTMLDivElement | null = null;

	public constructor(props: IBezierEditorProps) {
		super(props);
		this.state = {
			curve: this._getCurveFromValue(),
			dragging: false,
			dragPoint: null,
			hoveredPoint: null,
			width: 400,
			height: 250,
			showValues: false,
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

		// Support both old format (array) and new format (direct object)
		if (this.props.value.data.functions && Array.isArray(this.props.value.data.functions)) {
			const firstFunction = this.props.value.data.functions[0];
			if (firstFunction && firstFunction.function) {
				return {
					p0: firstFunction.function.p0 ?? 0,
					p1: firstFunction.function.p1 ?? 1.0 / 3,
					p2: firstFunction.function.p2 ?? (1.0 / 3) * 2,
					p3: firstFunction.function.p3 ?? 1,
					start: 0,
				};
			}
		}

		// New format: direct function object
		if (this.props.value.data.function) {
			return {
				p0: this.props.value.data.function.p0 ?? 0,
				p1: this.props.value.data.function.p1 ?? 1.0 / 3,
				p2: this.props.value.data.function.p2 ?? (1.0 / 3) * 2,
				p3: this.props.value.data.function.p3 ?? 1,
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

		// Save as direct function object (not array)
		this.props.value.data.function = {
			p0: Math.max(0, Math.min(1, this.state.curve.p0)),
			p1: Math.max(0, Math.min(1, this.state.curve.p1)),
			p2: Math.max(0, Math.min(1, this.state.curve.p2)),
			p3: Math.max(0, Math.min(1, this.state.curve.p3)),
		};
	}

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

	private _valueToSvgY(value: number): number {
		// Map value from [0, 1] to SVG Y coordinate
		// Center is at height/2, full range is height * 0.8 (40% above and below center)
		const padding = this.state.height * 0.1;
		const range = this.state.height * 0.8;
		return padding + (1 - value) * range;
	}

	private _svgYToValue(svgY: number): number {
		const padding = this.state.height * 0.1;
		const range = this.state.height * 0.8;
		return Math.max(0, Math.min(1, (this.state.height - svgY - padding) / range));
	}

	private _handleMouseDown = (ev: MouseEvent<SVGCircleElement>, point: "p0" | "p1" | "p2" | "p3"): void => {
		ev.stopPropagation();
		if (ev.button !== 0) {
			return;
		}

		this.setState({
			dragging: true,
			dragPoint: point,
		});

		let mouseMoveListener: (event: globalThis.MouseEvent) => void;
		let mouseUpListener: (event: globalThis.MouseEvent) => void;

		mouseMoveListener = (ev: globalThis.MouseEvent) => {
			if (!this.state.dragging || !this.state.dragPoint) {
				return;
			}

			const svgPos = this._screenToSvg(ev.clientX, ev.clientY);
			const value = this._svgYToValue(svgPos.y);

			const curve = { ...this.state.curve };

			if (this.state.dragPoint === "p0") {
				curve.p0 = value;
			} else if (this.state.dragPoint === "p1") {
				curve.p1 = value;
			} else if (this.state.dragPoint === "p2") {
				curve.p2 = value;
			} else if (this.state.dragPoint === "p3") {
				curve.p3 = value;
			}

			this.setState({ curve });
		};

		mouseUpListener = () => {
			document.body.removeEventListener("mousemove", mouseMoveListener);
			document.body.removeEventListener("mouseup", mouseUpListener);
			document.body.style.cursor = "";

			this._saveCurveToValue();
			this.props.onChange();

			this.setState({
				dragging: false,
				dragPoint: null,
			});
		};

		document.body.style.cursor = "move";
		document.body.addEventListener("mousemove", mouseMoveListener);
		document.body.addEventListener("mouseup", mouseUpListener);
	};

	private _bezierValue(t: number, p0: number, p1: number, p2: number, p3: number): number {
		const t2 = t * t;
		const t3 = t2 * t;
		const mt = 1 - t;
		const mt2 = mt * mt;
		const mt3 = mt2 * mt;
		return p0 * mt3 + p1 * mt2 * t * 3 + p2 * mt * t2 * 3 + p3 * t3;
	}

	private _renderCurve(curve: IBezierCurve): ReactNode {
		const segments = 100;
		const pathData: string[] = [];
		const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

		// Calculate actual Bezier curve points
		// For cubic Bezier: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
		// But we're using p0, p1, p2, p3 as control values, not positions
		// We need to map them to actual control points
		const p0X = 0;
		const p0Y = this._valueToSvgY(curve.p0);
		const p1X = this.state.width / 3;
		const p1Y = this._valueToSvgY(curve.p1);
		const p2X = (this.state.width * 2) / 3;
		const p2Y = this._valueToSvgY(curve.p2);
		const p3X = this.state.width;
		const p3Y = this._valueToSvgY(curve.p3);

		// Generate curve path
		for (let i = 0; i <= segments; i++) {
			const t = i / segments;
			const x = t * this.state.width;
			const y = this._bezierValue(t, p0Y, p1Y, p2Y, p3Y);

			if (i === 0) {
				pathData.push(`M ${x} ${y}`);
			} else {
				pathData.push(`L ${x} ${y}`);
			}
		}

		const isHovered = (point: "p0" | "p1" | "p2" | "p3") => this.state.hoveredPoint === point || this.state.dragPoint === point;
		const getPointRadius = (point: "p0" | "p1" | "p2" | "p3") => {
			if (point === "p0" || point === "p3") {
				return isHovered(point) ? 7 : 5;
			}
			return isHovered(point) ? 6 : 4;
		};
		const getPointColor = (point: "p0" | "p1" | "p2" | "p3") => {
			if (point === "p0" || point === "p3") {
				return isHovered(point) ? "#3b82f6" : "#2563eb";
			}
			return isHovered(point) ? "#8b5cf6" : "#7c3aed";
		};

		return (
			<g>
				<defs>
					<linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
						<stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
					</linearGradient>
				</defs>

				{/* Filled area under curve */}
				<path
					d={`${pathData.join(" ")} L ${this.state.width} ${this.state.height} L 0 ${this.state.height} Z`}
					fill={`url(#${gradientId})`}
					className="transition-opacity duration-200"
				/>

				{/* Curve line */}
				<path d={pathData.join(" ")} stroke="#3b82f6" strokeWidth="2.5" fill="none" className="transition-all duration-200" />

				{/* Control lines */}
				<line x1={p0X} y1={p0Y} x2={p1X} y2={p1Y} stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 2" className="opacity-40" />
				<line x1={p2X} y1={p2Y} x2={p3X} y2={p3Y} stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 2" className="opacity-40" />

				{/* Control points */}
				{(["p0", "p1", "p2", "p3"] as const).map((point) => {
					const x = point === "p0" ? p0X : point === "p1" ? p1X : point === "p2" ? p2X : p3X;
					const y = point === "p0" ? p0Y : point === "p1" ? p1Y : point === "p2" ? p2Y : p3Y;
					const value = curve[point];
					const radius = getPointRadius(point);
					const color = getPointColor(point);

					return (
						<g key={point}>
							{/* Outer glow when hovered */}
							{isHovered(point) && <circle cx={x} cy={y} r={radius + 4} fill={color} opacity="0.2" className="transition-all duration-200" />}
							{/* Point circle */}
							<circle
								cx={x}
								cy={y}
								r={radius}
								fill={color}
								stroke="white"
								strokeWidth="2"
								className="cursor-move transition-all duration-200 hover:scale-110"
								onMouseDown={(ev) => this._handleMouseDown(ev, point)}
								onMouseEnter={() => this.setState({ hoveredPoint: point, showValues: true })}
								onMouseLeave={() => this.setState({ hoveredPoint: null, showValues: false })}
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

		// Horizontal grid lines (value markers)
		for (let i = 0; i <= 10; i++) {
			const value = i / 10;
			const y = this._valueToSvgY(value);
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
				</g>
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

		// Center line (value = 0.5)
		gridLines.push(
			<line
				key="center"
				x1="0"
				y1={this._valueToSvgY(0.5)}
				x2={this.state.width}
				y2={this._valueToSvgY(0.5)}
				stroke="currentColor"
				strokeWidth="1"
				className="opacity-30"
				strokeDasharray="2 2"
			/>
		);

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
						className="w-full h-full"
						style={{ background: "var(--background)" }}
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
								min={0}
								max={1}
								step={0.01}
								onChange={() => {
									this.setState({ curve: { ...this.state.curve } });
									this._saveCurveToValue();
									this.props.onChange();
								}}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-xs text-muted-foreground">Control 1 (P1)</label>
							<EditorInspectorNumberField
								object={this.state.curve}
								property="p1"
								label=""
								min={0}
								max={1}
								step={0.01}
								onChange={() => {
									this.setState({ curve: { ...this.state.curve } });
									this._saveCurveToValue();
									this.props.onChange();
								}}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-xs text-muted-foreground">Control 2 (P2)</label>
							<EditorInspectorNumberField
								object={this.state.curve}
								property="p2"
								label=""
								min={0}
								max={1}
								step={0.01}
								onChange={() => {
									this.setState({ curve: { ...this.state.curve } });
									this._saveCurveToValue();
									this.props.onChange();
								}}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-xs text-muted-foreground">End (P3)</label>
							<EditorInspectorNumberField
								object={this.state.curve}
								property="p3"
								label=""
								min={0}
								max={1}
								step={0.01}
								onChange={() => {
									this.setState({ curve: { ...this.state.curve } });
									this._saveCurveToValue();
									this.props.onChange();
								}}
							/>
						</div>
					</div>
				</EditorInspectorBlockField>
			</div>
		);
	}
}
