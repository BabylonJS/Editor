import { IAnimationKey } from "babylonjs";

import { Key } from "./key";
import { Card } from "./card";

import { undoRedo } from "../../../../editor/tools/undo-redo";

import { ICinematicAnimationGroupSlot } from "../../../../editor/cinematic/track";

export enum TrackElementType {
	Key = "key",
	Card = "card",
}

export type TrackElement = Key | Card;

interface _IUndoRedoPosition {
	position: number;
	type: TrackElementType;

	animationKey?: IAnimationKey;
	animationGroupSlot?: ICinematicAnimationGroupSlot;
}

export class TrackElements {
	/**
	 * Defines the list of all available keys frames.
	 */
	public static Keys: Key[] = [];
	/**
	 * Defines the list of all available animation group cards.
	 */
	public static Cards: Card[] = [];

	/**
	 * Defines the list of all available track elements.
	 */
	public static All: TrackElement[] = [];

	private static _UndoRedoPositions: _IUndoRedoPosition[] = [];

	/**
	 * Prepares all track elements for drag'n'drop.
	 */
	public static PrepareDragAndDrop(): void {
		this._UndoRedoPositions = [];

		this.All.forEach((a) => {
			a._startPosition = a.state.position;

			this._UndoRedoPositions.push({
				type: a.elementType,
				position: a.state.position,
				animationKey: (a as Key).props.animationKey,
				animationGroupSlot: (a as Card).props.animationGroupSlot,
			});
		});
	}

	/**
	 * Moves the given element applying the given offset.
	 * @param element defines the reference to the element to move.
	 * @param offset defines the offset expressed in pixels to move the element.
	 */
	public static MoveElement(element: TrackElement, offset: number): void {
		const position = Math.round(Math.max(0, element._startPosition - offset));

		switch (element.elementType) {
			case TrackElementType.Key:
				const key = element as Key;
				key.props.animationKey.frame = position;
				key.setState({ position });
				break;

			case TrackElementType.Card:
				const card = element as Card;
				card.props.animationGroupSlot.position = position;
				card.setState({ position });
				break;
		}
	}

	/**
	 * Moves all the available elements applying the given offset where frame values of >= to the given element.
	 * @param element defines the reference to the base element to move.
	 * @param offset defines the offset expressed in pixels to move the elements.
	 */
	public static MoveElementsFrom(element: TrackElement, offset: number): void {
		this.All.forEach((a) => {
			if (a.props.position < element.props.position) {
				return;
			}

			this.MoveElement(a, offset);
		});
	}

	/**
	 * Ends all track elements for drag'n'drop and manages undo-redo.
	 */
	public static EndDragAndDrop(onAction: () => void): void {
		const oldPositions = this._UndoRedoPositions.slice();
		const newPositions = this.All.map((a) => {
			return {
				type: a.elementType,
				position: a.state.position,
				animationKey: (a as Key).props.animationKey,
				animationGroupSlot: (a as Card).props.animationGroupSlot,
			} as _IUndoRedoPosition;
		});

		undoRedo.push({
			common: (s) => {
				if (s !== "push") {
					onAction();
				}
			},
			undo: () => {
				oldPositions.forEach((op) => {
					switch (op.type) {
						case TrackElementType.Key: op.animationKey && (op.animationKey.frame = op.position); break;
						case TrackElementType.Card: op.animationGroupSlot && (op.animationGroupSlot.position = op.position); break;
					}
				});
			},
			redo: () => {
				newPositions.forEach((np) => {
					switch (np.type) {
						case TrackElementType.Key: np.animationKey && (np.animationKey.frame = np.position); break;
						case TrackElementType.Card: np.animationGroupSlot && (np.animationGroupSlot.position = np.position); break;
					}
				});
			},
		});
	}
}
