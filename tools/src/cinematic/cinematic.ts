import { Observable } from "@babylonjs/core/Misc/observable";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";

export class Cinematic extends AnimationGroup {
	/**
	 * Defines the observable used to notify observers when an event is raised during the cinematic playback.
	 */
	public onEventObservable: Observable<string> = new Observable<string>();

	/**
	 * Registers and calls the given callback on the provided event name is emitted during the cinematic playback.
	 * @param eventName defines the name of the event to listen to
	 * @param callback defines the callback to call when the event is raised
	 */
	public onEvent(eventName: string, callback: () => void): void {
		this.onEventObservable.add((event) => {
			if (eventName === event) {
				callback();
			}
		});
	}
}
