import { assistantIconColors } from "./icon";

/**
 * Defines how long, in milliseconds, the smoke takes to dissipate once the panel of the assistant stopped sliding.
 */
const dissipationDuration = 900;

/**
 * Defines the resolution of the canvas of the smoke relative to the size of the editor. Smoke is soft: it is drawn at
 * a lower resolution and blurred.
 */
const smokeCanvasScale = 0.5;

/**
 * Defines how much, in pixels, the smoke blurs the UI behind it.
 */
const smokeBackdropBlur = 8;

/**
 * Defines the width, in pixels, of the band along the edge of the panel where the smoke blurs the UI.
 */
const smokeBackdropWidth = 360;

/**
 * Defines how many puffs of smoke are released per millisecond while the panel slides, whatever the frame rate.
 */
const puffsPerMillisecond = 0.6;

/**
 * Defines how fast, per second, the smoke loses its speed once it isn't pushed anymore.
 */
const smokeDrag = 2.2;

/**
 * Defines how fast, per second, the edge of the panel gives its speed to the smoke it pushes.
 */
const smokePushRate = 20;

/**
 * Defines how fast, in pixels per second squared, the smoke rises.
 */
const smokeBuoyancy = 30;

interface ISmokePuff {
	x: number;
	y: number;
	radius: number;
	growth: number;
	velocityX: number;
	velocityY: number;
	/**
	 * Defines the part of the speed of the edge of the panel the puff takes when the edge pushes it: puffs are more or
	 * less dense, so they don't all fly as far.
	 */
	push: number;
	/**
	 * Defines how far, in pixels, the puff can be over the panel of the assistant while it slides.
	 */
	overlap: number;
	/**
	 * Defines the eddy the puff swirls in: its phase, its angular speed in radians per second and its strength in pixels
	 * per second squared.
	 */
	swirlPhase: number;
	swirlSpeed: number;
	swirlStrength: number;
	color: string;
	opacity: number;
	spawnTime: number;
	/**
	 * Defines how long, in milliseconds, the puff takes to vanish once the smoke dissipates.
	 */
	fadeDuration: number;
}

let hasPlayed = false;

/**
 * Plays, once per session of the editor, a multicolor smoke that clings to the left edge of the panel of the assistant
 * while it slides open, blurring the UI behind it, and dissipates once the panel is open. Everything the effect creates
 * is removed from the page and released once it ends.
 * @param getPanelLeft defines the function returning the left edge, in pixels, of the panel of the assistant.
 * @param panelAnimationDuration defines how long, in milliseconds, the panel of the assistant slides.
 */
export function playAssistantSmokeEffectOnce(getPanelLeft: () => number, panelAnimationDuration: number): void {
	if (hasPlayed) {
		return;
	}

	hasPlayed = true;

	if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
		return;
	}

	new AssistantSmokeEffect(getPanelLeft, panelAnimationDuration);
}

class AssistantSmokeEffect {
	private readonly _width = window.innerWidth;
	private readonly _height = window.innerHeight;
	private readonly _isDark = document.body.classList.contains("dark");

	private readonly _overlay = document.createElement("div");
	private readonly _backdrop = document.createElement("div");
	private readonly _smoke = document.createElement("canvas");
	private readonly _smokeContext: CanvasRenderingContext2D;

	private _puffs: ISmokePuff[] = [];

	private _startTime: number | null = null;
	private _lastTime: number = 0;
	private _animationFrame: number;
	private _panelLeft: number;
	private _panelVelocity: number = 0;
	private _puffsToRelease: number = 40;
	private _smokeCenter: number;

	public constructor(
		private _getPanelLeft: () => number,
		private _panelAnimationDuration: number
	) {
		this._panelLeft = this._width;
		this._smokeCenter = this._width;

		// The backdrop filter must not be in an element with an opacity, a filter or a mask: its backdrop would only be
		// the content of that element instead of the UI of the editor.
		Object.assign(this._overlay.style, {
			position: "fixed",
			inset: "0",
			zIndex: "9999",
			overflow: "hidden",
			pointerEvents: "none",
		});

		Object.assign(this._backdrop.style, {
			position: "absolute",
			left: "0",
			top: "0",
			width: `${smokeBackdropWidth}px`,
			height: "100%",
			backdropFilter: `blur(${smokeBackdropBlur}px)`,
			maskImage: "linear-gradient(to right, transparent, #000 30%, #000 55%, transparent)",
			transformOrigin: "30% 50%",
			transform: `translateX(${this._width}px)`,
		});

		this._smoke.width = Math.ceil(this._width * smokeCanvasScale);
		this._smoke.height = Math.ceil(this._height * smokeCanvasScale);
		Object.assign(this._smoke.style, {
			position: "absolute",
			left: "0",
			top: "0",
			width: `${this._width}px`,
			height: `${this._height}px`,
			filter: "blur(10px)",
			mixBlendMode: this._isDark ? "screen" : "normal",
		});

		this._smokeContext = this._smoke.getContext("2d")!;

		this._overlay.append(this._backdrop, this._smoke);
		document.body.append(this._overlay);

		this._animationFrame = requestAnimationFrame((time) => this._update(time));
	}

	private _update(time: number): void {
		this._startTime ??= time;

		const elapsed = time - this._startTime;
		const previousElapsed = this._lastTime;
		const deltaTime = Math.min(50, elapsed - previousElapsed) / 1000;
		this._lastTime = elapsed;

		// The smoke is released along the edge of the panel while it slides. Reading the edge forces a layout of the
		// page: it is read only during the animation of the panel.
		const isSliding = elapsed <= this._panelAnimationDuration;
		if (isSliding) {
			const panelLeft = this._getPanelLeft();

			this._panelVelocity = deltaTime > 0 ? (panelLeft - this._panelLeft) / deltaTime : 0;
			this._panelLeft = panelLeft;

			this._puffsToRelease += (elapsed - previousElapsed) * puffsPerMillisecond;
			this._releasePuffs(elapsed, Math.floor(this._puffsToRelease));
			this._puffsToRelease %= 1;
		}

		const dissipation = Math.max(0, elapsed - this._panelAnimationDuration);

		this._updatePuffs(deltaTime, elapsed, isSliding, dissipation);
		this._drawPuffs(elapsed, dissipation);

		// The blur spreads and fades with the smoke.
		const blurProgress = easeOutCubic(Math.min(1, dissipation / (dissipationDuration * 0.8)));
		this._backdrop.style.opacity = `${1 - blurProgress}`;
		this._backdrop.style.transform = `translateX(${this._smokeCenter - smokeBackdropWidth * 0.3}px) scaleX(${1 + blurProgress * 0.6})`;

		if (!isSliding && !this._puffs.length) {
			return this._dispose();
		}

		this._animationFrame = requestAnimationFrame((time) => this._update(time));
	}

	private _releasePuffs(elapsed: number, count: number): void {
		for (let i = 0; i < count; ++i) {
			const y = Math.random() * this._height;

			// Colors flow from top to bottom like on the button of the assistant, with a bit of mixing.
			const colorIndex = Math.floor((y / this._height) * assistantIconColors.length + (Math.random() - 0.5) * 1.5);

			const push = 0.35 + Math.random() * 0.45;

			this._puffs.push({
				x: this._panelLeft + (Math.random() - 0.6) * 100,
				y,
				radius: 60 + Math.random() * 90,
				growth: 50 + Math.random() * 80,
				// Puffs leave the edge with a part of its speed and blow up or down.
				velocityX: this._panelVelocity * push * Math.random(),
				velocityY: (Math.random() - 0.5) * 240,
				push,
				overlap: Math.random() * 50,
				swirlPhase: Math.random() * Math.PI * 2,
				swirlSpeed: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 4),
				swirlStrength: 150 + Math.random() * 350,
				color: assistantIconColors[(colorIndex + assistantIconColors.length) % assistantIconColors.length],
				opacity: (this._isDark ? 0.4 : 0.26) * (0.5 + Math.random() * 0.5),
				spawnTime: elapsed,
				fadeDuration: dissipationDuration * (0.5 + Math.random() * 0.5),
			});
		}
	}

	private _updatePuffs(deltaTime: number, elapsed: number, isSliding: boolean, dissipation: number): void {
		const drag = Math.exp(-smokeDrag * deltaTime);
		const push = 1 - Math.exp(-smokePushRate * deltaTime);
		const time = elapsed / 1000;

		let center = 0;

		for (const puff of this._puffs) {
			// The edge of the panel pushes the smoke in front of it but never holds it back: the smoke keeps the speed
			// it took and flies past the edge while the panel slows down.
			if (isSliding) {
				const pushedVelocity = this._panelVelocity * puff.push;
				if (pushedVelocity < puff.velocityX) {
					puff.velocityX += (pushedVelocity - puff.velocityX) * push;
				}
			}

			// Each puff swirls in its own eddy while rising.
			const swirlAngle = puff.swirlPhase + time * puff.swirlSpeed;
			puff.velocityX += Math.cos(swirlAngle) * puff.swirlStrength * deltaTime;
			puff.velocityY += (Math.sin(swirlAngle) * puff.swirlStrength - smokeBuoyancy) * deltaTime;

			puff.velocityX *= drag;
			puff.velocityY *= drag;

			puff.x += puff.velocityX * deltaTime;
			puff.y += puff.velocityY * deltaTime;

			if (isSliding) {
				puff.x = Math.min(puff.x, this._panelLeft + puff.overlap);
			}

			// The smoke grows faster while it dissipates.
			puff.radius += puff.growth * deltaTime * (dissipation > 0 ? 1.8 : 1);

			center += puff.x;
		}

		// The blur follows the smoke where it flows.
		if (this._puffs.length) {
			this._smokeCenter = center / this._puffs.length;
		}

		this._puffs = this._puffs.filter((puff) => dissipation < puff.fadeDuration);
	}

	private _drawPuffs(elapsed: number, dissipation: number): void {
		const context = this._smokeContext;

		context.setTransform(1, 0, 0, 1, 0, 0);
		context.globalCompositeOperation = "source-over";
		context.clearRect(0, 0, this._smoke.width, this._smoke.height);

		context.setTransform(smokeCanvasScale, 0, 0, smokeCanvasScale, 0, 0);
		context.globalCompositeOperation = this._isDark ? "screen" : "source-over";

		for (const puff of this._puffs) {
			const fadeIn = Math.min(1, (elapsed - puff.spawnTime) / 80);
			const fadeOut = 1 - easeOutCubic(Math.min(1, dissipation / puff.fadeDuration));

			context.globalAlpha = puff.opacity * fadeIn * fadeOut;

			// Fast puffs stretch along their motion.
			const speed = Math.hypot(puff.velocityX, puff.velocityY);
			const stretch = 1 + Math.min(1.2, speed / 1500);

			context.save();
			context.translate(puff.x, puff.y);
			context.rotate(Math.atan2(puff.velocityY, puff.velocityX));
			context.scale(stretch, 1 / Math.sqrt(stretch));

			const gradient = context.createRadialGradient(0, 0, 0, 0, 0, puff.radius);
			gradient.addColorStop(0, withAlpha(puff.color, 0.8));
			gradient.addColorStop(0.35, withAlpha(puff.color, 0.5));
			gradient.addColorStop(0.7, withAlpha(puff.color, 0.18));
			gradient.addColorStop(1, withAlpha(puff.color, 0));

			context.fillStyle = gradient;
			context.fillRect(-puff.radius, -puff.radius, puff.radius * 2, puff.radius * 2);
			context.restore();
		}
	}

	private _dispose(): void {
		cancelAnimationFrame(this._animationFrame);

		this._overlay.remove();

		// Canvases keep their pixels until they are collected: release them now.
		this._smoke.width = 0;
		this._smoke.height = 0;

		this._puffs = [];
	}
}

function withAlpha(color: string, alpha: number): string {
	return `${color}${Math.round(alpha * 255)
		.toString(16)
		.padStart(2, "0")}`;
}

function easeOutCubic(x: number): number {
	return 1 - (1 - x) ** 3;
}
