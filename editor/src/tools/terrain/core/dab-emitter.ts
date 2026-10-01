import { hashTerrainSeed, mulberry32 } from "./random";
import type { ITerrainBrushSettings, ITerrainDab, ITerrainStrokeSample } from "./types";

export interface ITerrainDabEmitterOptions {
	brush: ITerrainBrushSettings;
	strength: number;
	airbrush: boolean;
	singleDab: boolean;
	seed: number;
	/** Minimum dab distance in metric cm (0.25 x the smallest world cell size). */
	minSpacing: number;
	/** Metric-local centre used by symmetry. */
	symmetryCenter: { mx: number; mz: number };
}

/** Airbrush dab period (30 Hz) in sample time (ms). */
const TERRAIN_AIRBRUSH_PERIOD_MS = 1000 / 30;
/** amountScale of the airbrush dabs (§4.3.2). */
const TERRAIN_AIRBRUSH_AMOUNT_SCALE = 0.2;
/**
 * The airbrush stops this long (sample time) after the last sample: a safety bound (1800 dabs) against a drain time taken from another clock
 * than the samples'. It only depends on the samples, so split drains still give the same dabs.
 */
const TERRAIN_AIRBRUSH_MAX_HOLD_MS = 60000;
/** Smallest radius factor of the size jitter. */
const TERRAIN_MIN_SIZE_JITTER_FACTOR = 0.05;
const TERRAIN_DEGREES_TO_RADIANS = Math.PI / 180;

/** Normalized pointer sample waiting in the queue; null entries are path breaks. */
interface ITerrainQueuedSample {
	mx: number;
	mz: number;
	pressure: number;
	pen: boolean;
	timeMs: number;
	invert: boolean;
}

/** Point of the brush path where a dab is due (before jitter and pressure). */
interface ITerrainDabOrigin {
	mx: number;
	mz: number;
	timeMs: number;
	pressure: number;
	pen: boolean;
	invert: boolean;
	amountScale: number;
	/** Radians, heading of the path segment (followStroke). */
	heading: number;
}

/** Values shared by a dab and its symmetry copies. */
interface ITerrainDabShared {
	radius: number;
	strength: number;
	amountScale: number;
	invert: boolean;
}

/**
 * Spacing, airbrush, lazy mouse, jitter, pressure and symmetry of the dabs (§4.3.2).
 *
 * Samples are queued by addSample/breakPath and turned into dabs by drain/finish, in order, so the dabs only depend on the samples
 * (and, for the airbrush, on the time until which they are drained): the same sample list produces the same dabs whether it is drained
 * in one call or split over any number of drain calls with non-decreasing times.
 * - The first sample of a path emits a dab. Then the lazy-mouse brush point b walks the polyline of the samples and a dab is emitted every
 *   Δ = max(spacing × 2R, minSpacing) of b's path (carried remainder), with amountScale = min(1, Δ / 2R); pressure and time are interpolated.
 * - Airbrush: when no dab was emitted during the last 1000/30 ms of sample time, a dab is emitted at b every 1000/30 ms (amountScale 0.2)
 *   up to the next sample's time or the drain time (at most 60 s after the last sample). A queued sample whose time is later than the drain
 *   time waits for a later drain.
 *   Without airbrush, every queued sample is processed whatever its time (headless strokes use synthetic times).
 * - singleDab: one dab at the first sample (with its symmetry copies), nothing else (amountScale 1).
 * - Jitter: rng = mulberry32(seed) with exactly 5 draws per dab, then pen pressure, then symmetry copies (which share radius, strength and
 *   amountScale); index increments per emitted dab (copies included) and seed = hashTerrainSeed(strokeSeed, index).
 * - dab.invert is the invert flag of the sample that produced the dab (the stroke engine combines it with the request).
 */
export class TerrainDabEmitter {
	private readonly _brush: ITerrainBrushSettings;
	private readonly _strength: number;
	private readonly _airbrush: boolean;
	private readonly _singleDab: boolean;
	private readonly _seed: number;
	private readonly _symmetryX: number;
	private readonly _symmetryZ: number;
	private readonly _random: () => number;

	/** R: brush radius (world cm). */
	private readonly _radius: number;
	/** Δ: distance between two spaced dabs. */
	private readonly _spacing: number;
	private readonly _spacedAmountScale: number;
	/** L: lazy-mouse radius. */
	private readonly _lazyRadius: number;

	private readonly _positionJitter: number;
	private readonly _rotationJitter: number;
	private readonly _sizeJitter: number;
	private readonly _strengthJitter: number;
	private readonly _pressureSizeMin: number;

	private _queue: (ITerrainQueuedSample | null)[] = [];
	private _queueStart: number = 0;
	private _lastQueuedTime: number = -Infinity;

	private _hasPoint: boolean = false;
	private _bx: number = 0;
	private _bz: number = 0;
	private _time: number = 0;
	private _pressure: number = 1;
	private _pen: boolean = false;
	private _invert: boolean = false;
	private _travelled: number = 0;
	private _heading: number = 0;

	private _lastDabTime: number = -Infinity;
	private _index: number = 0;
	private _singleDone: boolean = false;
	private _finished: boolean = false;

	public constructor(options: ITerrainDabEmitterOptions) {
		const brush = options.brush;

		this._brush = brush;
		this._strength = clamp01(options.strength);
		this._airbrush = options.airbrush && !options.singleDab;
		this._singleDab = options.singleDab;
		this._seed = Number.isFinite(options.seed) ? options.seed : 0;
		this._symmetryX = Number.isFinite(options.symmetryCenter.mx) ? options.symmetryCenter.mx : 0;
		this._symmetryZ = Number.isFinite(options.symmetryCenter.mz) ? options.symmetryCenter.mz : 0;
		this._random = mulberry32(this._seed);

		this._radius = brush.radius > 0 && Number.isFinite(brush.radius) ? brush.radius : 1;

		const spacing = Number.isFinite(brush.spacing) ? Math.min(2, Math.max(0.02, brush.spacing)) : 0.15;
		const minSpacing = options.minSpacing > 0 && Number.isFinite(options.minSpacing) ? options.minSpacing : 0;
		this._spacing = Math.max(spacing * 2 * this._radius, minSpacing);
		this._spacedAmountScale = Math.min(1, this._spacing / (2 * this._radius));
		this._lazyRadius = clamp(brush.smoothing, 0, 0.95) * this._radius;

		this._positionJitter = clamp01(brush.positionJitter);
		this._rotationJitter = clamp(brush.rotationJitter, 0, 180);
		this._sizeJitter = clamp01(brush.sizeJitter);
		this._strengthJitter = clamp01(brush.strengthJitter);
		this._pressureSizeMin = clamp01(brush.pressureSizeMin);
	}

	/** Metric-local position of the lazy-mouse brush point b of the processed samples, null before the first sample and after a path break. */
	public get lazyCenter(): { mx: number; mz: number } | null {
		return this._hasPoint ? { mx: this._bx, mz: this._bz } : null;
	}

	public addSample(sample: ITerrainStrokeSample): void {
		if (this._finished || !Number.isFinite(sample.mx) || !Number.isFinite(sample.mz)) {
			return;
		}

		// Sample times never go backwards (coalesced events are ordered; a late timestamp is clamped).
		const time = Number.isFinite(sample.timeMs) ? Math.max(sample.timeMs, this._lastQueuedTime) : Math.max(0, this._lastQueuedTime);
		this._lastQueuedTime = time;

		const pen = sample.pointerType === "pen";
		this._queue.push({
			mx: sample.mx,
			mz: sample.mz,
			pressure: pen ? clamp01(sample.pressure) : 1,
			pen,
			timeMs: time,
			invert: sample.invert,
		});
	}

	/** No dab bridges the gap: the next sample starts a new path (with its own first dab). */
	public breakPath(): void {
		if (!this._finished) {
			this._queue.push(null);
		}
	}

	/** Emits every dab due up to untilTimeMs (sample time base). Deterministic w.r.t. samples only. */
	public drain(untilTimeMs: number, out: ITerrainDab[]): void {
		if (!this._finished) {
			this._process(Number.isNaN(untilTimeMs) ? -Infinity : untilTimeMs, out, false);
		}
	}

	/** Processes every queued sample (no airbrush dab after the last one); the emitter ignores everything afterwards. */
	public finish(out: ITerrainDab[]): void {
		if (!this._finished) {
			this._process(Infinity, out, true);
			this._finished = true;
		}
	}

	private _process(untilTimeMs: number, out: ITerrainDab[], finishing: boolean): void {
		while (this._queueStart < this._queue.length) {
			const sample = this._queue[this._queueStart];
			if (!sample) {
				this._hasPoint = false;
				++this._queueStart;
				continue;
			}

			if (this._airbrush && !finishing && sample.timeMs > untilTimeMs) {
				break;
			}

			if (this._airbrush) {
				this._emitAirbrushDabs(sample.timeMs, out);

				// After a stop (60 s without samples), the airbrush restarts from this sample instead of catching up the silent period.
				if (this._hasPoint && sample.timeMs > this._time + TERRAIN_AIRBRUSH_MAX_HOLD_MS && sample.timeMs > this._lastDabTime) {
					this._lastDabTime = sample.timeMs;
				}
			}

			this._processSample(sample, out);
			++this._queueStart;
		}

		if (this._queueStart >= this._queue.length) {
			this._queue = [];
			this._queueStart = 0;
		} else if (this._queueStart > 1024) {
			this._queue = this._queue.slice(this._queueStart);
			this._queueStart = 0;
		}

		if (this._airbrush && !finishing) {
			this._emitAirbrushDabs(untilTimeMs, out);
		}
	}

	private _emitAirbrushDabs(untilTimeMs: number, out: ITerrainDab[]): void {
		// A path always starts with a dab, so _lastDabTime is finite here; the guards keep the loop finite whatever the input.
		if (!this._hasPoint || !Number.isFinite(untilTimeMs) || !Number.isFinite(this._lastDabTime)) {
			return;
		}

		const limit = Math.min(untilTimeMs, this._time + TERRAIN_AIRBRUSH_MAX_HOLD_MS);
		while (this._lastDabTime + TERRAIN_AIRBRUSH_PERIOD_MS <= limit) {
			this._emit(
				{
					mx: this._bx,
					mz: this._bz,
					timeMs: this._lastDabTime + TERRAIN_AIRBRUSH_PERIOD_MS,
					pressure: this._pressure,
					pen: this._pen,
					invert: this._invert,
					amountScale: TERRAIN_AIRBRUSH_AMOUNT_SCALE,
					heading: this._heading,
				},
				out
			);
		}
	}

	private _processSample(sample: ITerrainQueuedSample, out: ITerrainDab[]): void {
		if (!this._hasPoint) {
			this._hasPoint = true;
			this._bx = sample.mx;
			this._bz = sample.mz;
			this._time = sample.timeMs;
			this._pressure = sample.pressure;
			this._pen = sample.pen;
			this._invert = sample.invert;
			this._travelled = 0;

			if (!this._singleDab || !this._singleDone) {
				this._singleDone = true;
				this._emit(
					{
						mx: sample.mx,
						mz: sample.mz,
						timeMs: sample.timeMs,
						pressure: sample.pressure,
						pen: sample.pen,
						invert: sample.invert,
						amountScale: this._singleDab ? 1 : this._spacedAmountScale,
						heading: this._heading,
					},
					out
				);
			}

			return;
		}

		// Lazy mouse: b follows p at distance L.
		let nextX = this._bx;
		let nextZ = this._bz;
		const toX = sample.mx - this._bx;
		const toZ = sample.mz - this._bz;
		const distance = Math.sqrt(toX * toX + toZ * toZ);
		if (distance > this._lazyRadius) {
			const factor = (distance - this._lazyRadius) / distance;
			nextX = this._bx + toX * factor;
			nextZ = this._bz + toZ * factor;
		}

		if (!this._singleDab) {
			const segmentX = nextX - this._bx;
			const segmentZ = nextZ - this._bz;
			const segmentLength = Math.sqrt(segmentX * segmentX + segmentZ * segmentZ);

			if (segmentLength > 0) {
				const heading = Math.atan2(segmentZ, segmentX);
				let along = this._spacing - this._travelled;

				while (along <= segmentLength) {
					const f = along / segmentLength;
					this._heading = heading;
					this._emit(
						{
							mx: this._bx + segmentX * f,
							mz: this._bz + segmentZ * f,
							timeMs: this._time + (sample.timeMs - this._time) * f,
							pressure: this._pressure + (sample.pressure - this._pressure) * f,
							pen: sample.pen,
							invert: sample.invert,
							amountScale: this._spacedAmountScale,
							heading,
						},
						out
					);
					along += this._spacing;
				}

				this._travelled = segmentLength - (along - this._spacing);
			}
		}

		this._bx = nextX;
		this._bz = nextZ;
		this._time = sample.timeMs;
		this._pressure = sample.pressure;
		this._pen = sample.pen;
		this._invert = sample.invert;
	}

	/** Jitter (5 draws), pressure, then the dab and its symmetry copies. */
	private _emit(origin: ITerrainDabOrigin, out: ITerrainDab[]): void {
		const brush = this._brush;

		// Exactly 5 draws per dab, in this order, whatever the jitter settings (determinism).
		const r1 = this._random();
		const r2 = this._random();
		const r3 = this._random();
		const r4 = this._random();
		const r5 = this._random();

		let radius = this._radius * Math.max(TERRAIN_MIN_SIZE_JITTER_FACTOR, 1 + (2 * r1 - 1) * this._sizeJitter);
		let strength = clamp01(this._strength * (1 + (2 * r2 - 1) * this._strengthJitter));

		const angle = 2 * Math.PI * r3;
		const offset = Math.sqrt(r4) * this._positionJitter * this._radius;
		const x = origin.mx + Math.cos(angle) * offset;
		const z = origin.mz + Math.sin(angle) * offset;

		const rotationDegrees = Number.isFinite(brush.rotation) ? brush.rotation : 0;
		const rotation = (rotationDegrees + (2 * r5 - 1) * this._rotationJitter) * TERRAIN_DEGREES_TO_RADIANS + (brush.followStroke ? origin.heading : 0);

		if (origin.pen) {
			if (brush.pressureSize) {
				radius *= this._pressureSizeMin + (1 - this._pressureSizeMin) * origin.pressure;
			}
			if (brush.pressureStrength) {
				strength *= origin.pressure;
			}
		}

		if (origin.timeMs > this._lastDabTime) {
			this._lastDabTime = origin.timeMs;
		}

		// Symmetry copies share radius, strength, amountScale and invert.
		const shared = { radius, strength, amountScale: origin.amountScale, invert: origin.invert };
		this._push(out, shared, x, z, rotation, false);

		const mirrorX = 2 * this._symmetryX - x;
		const mirrorZ = 2 * this._symmetryZ - z;
		switch (brush.symmetry) {
			case "x":
				this._push(out, shared, mirrorX, z, -rotation, true);
				break;
			case "z":
				this._push(out, shared, x, mirrorZ, Math.PI - rotation, true);
				break;
			case "xz":
				this._push(out, shared, mirrorX, z, -rotation, true);
				this._push(out, shared, x, mirrorZ, Math.PI - rotation, true);
				this._push(out, shared, mirrorX, mirrorZ, rotation + Math.PI, false);
				break;
		}
	}

	private _push(out: ITerrainDab[], shared: ITerrainDabShared, mx: number, mz: number, rotation: number, mirrored: boolean): void {
		const index = this._index++;
		out.push({
			index,
			mx,
			mz,
			radius: shared.radius,
			rotation,
			strength: shared.strength,
			amountScale: shared.amountScale,
			invert: shared.invert,
			seed: hashTerrainSeed(this._seed, index),
			mirrored,
		});
	}
}

function clamp(value: number, min: number, max: number): number {
	if (!(value > min)) {
		return min;
	}

	return value < max ? value : max;
}

function clamp01(value: number): number {
	return clamp(value, 0, 1);
}
