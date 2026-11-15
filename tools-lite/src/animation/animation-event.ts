/**
 * Defines an event raised when an animation reaches a given frame, the equivalent of a Babylon.js `AnimationEvent`.
 * Babylon Lite animations have no events: the events are raised by the animation groups of the tools.
 */
export class EditorAnimationEvent {
	/**
	 * Defines the frame of the animation at which the event is raised.
	 */
	public frame: number;
	/**
	 * Defines the callback called when the event is raised, with the current frame of the animation.
	 */
	public action: (currentFrame: number) => void;
	/**
	 * Defines wether or not the event is raised only once, even when the animation loops.
	 */
	public onlyOnce: boolean;

	/**
	 * @internal
	 */
	public _isDone: boolean = false;

	public constructor(frame: number, action: (currentFrame: number) => void, onlyOnce?: boolean) {
		this.frame = frame;
		this.action = action;
		this.onlyOnce = onlyOnce ?? false;
	}

	/**
	 * Clones the event.
	 */
	public clone(): EditorAnimationEvent {
		return new EditorAnimationEvent(this.frame, this.action, this.onlyOnce);
	}
}
