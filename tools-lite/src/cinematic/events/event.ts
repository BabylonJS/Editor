import { Cinematic } from "../cinematic";

export type EventType = {
	eventName: string;
};

export function handleApplyEvent(cinematic: Cinematic, eventData: EventType) {
	cinematic.onEventObservable.notifyObservers(eventData.eventName);
}
