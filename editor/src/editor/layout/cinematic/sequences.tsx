import { Component, MouseEvent, ReactNode } from "react";

import { AiOutlineClose, AiOutlinePlus } from "react-icons/ai";

import { Tools } from "babylonjs";
import { ICinematicSequence, getCinematicFramesCount } from "babylonjs-editor-tools";

import { Button } from "../../../ui/shadcn/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../../../ui/shadcn/ui/context-menu";

import { showPrompt } from "../../../ui/dialog";

import { isDomTextInputFocused } from "../../../tools/dom";
import { registerUndoRedo } from "../../../tools/undoredo";

import { CinematicEditor } from "./editor";
import { CinematicEditorTracker } from "./tracker";

import { CinematicEditorTimelineOptions } from "./timelines/options";

import { CinematicEditorSequence } from "./sequences/sequence";
import { CinematicEditorSequencesRuler } from "./sequences/ruler";
import {
	ICinematicSequenceLayout,
	getCinematicSequenceDropIndex,
	getCinematicSequencesFrameAt,
	getCinematicSequencesLayout,
	getCinematicSequencesPositionAt,
	getCinematicSequencesWidth,
} from "./sequences/layout";

export interface ICinematicEditorSequencesProps {
	/**
	 * Defines the number of pixels of a frame.
	 */
	scale: number;
	/**
	 * Defines the time of the tracker in the whole cinematic.
	 */
	currentTime: number;

	cinematicEditor: CinematicEditor;
}

export interface ICinematicEditorSequencesState {
	selectedSequence: ICinematicSequence | null;
	drag: ICinematicEditorSequenceDrag | null;
}

interface ICinematicEditorSequenceDrag {
	sequence: ICinematicSequence;
	/**
	 * Defines the position, in pixels, of the left of the dragged sequence.
	 */
	x: number;
	/**
	 * Defines the index, among the other sequences, where the sequence is dropped.
	 */
	dropIndex: number;
}

/**
 * Margin, in pixels, before the first sequence: the same as the timelines so the tracker is drawn the same way.
 */
const contentMargin = 8;

/**
 * Space, in pixels, between two sequences.
 */
const sequencesGap = 6;

/**
 * Distance, in pixels, the mouse moves before a pressed sequence is dragged.
 */
const dragThreshold = 4;

/**
 * Lists the sequences of a cinematic one after the other, as they are played: sequences can be added, renamed, removed and
 * reordered by drag'n'drop. Double-clicking a sequence edits its tracks. The tracker shows and changes the time of the
 * whole cinematic.
 */
export class CinematicEditorSequences extends Component<ICinematicEditorSequencesProps, ICinematicEditorSequencesState> {
	public tracker: CinematicEditorTracker | null = null;

	private _contentRef: HTMLDivElement | null = null;
	private _scrollRef: HTMLDivElement | null = null;

	private _hovered: boolean = false;
	private _keyDownListener: ((event: KeyboardEvent) => void) | null = null;

	public constructor(props: ICinematicEditorSequencesProps) {
		super(props);

		this.state = {
			drag: null,
			selectedSequence: null,
		};
	}

	public render(): ReactNode {
		const cinematic = this.props.cinematicEditor.cinematic;

		const layouts = getCinematicSequencesLayout(this._getDisplayedSequences(), this.props.scale);
		const width = getCinematicSequencesWidth(layouts);

		return (
			<div className="flex flex-col flex-1 overflow-hidden" onMouseEnter={() => (this._hovered = true)} onMouseLeave={() => (this._hovered = false)}>
				<div className="flex justify-between items-center w-full h-10 px-3 bg-secondary">
					<div className="flex items-center gap-2 font-semibold">
						<div>Sequences</div>
						<div className="font-normal text-muted-foreground">{cinematic.sequences.length}</div>
						<CinematicEditorTimelineOptions cinematicEditor={this.props.cinematicEditor} />
					</div>

					<Button variant="ghost" className="flex items-center gap-2 h-8 px-2" onClick={() => this.addSequence()}>
						<AiOutlinePlus className="w-4 h-4" /> Add Sequence
					</Button>
				</div>

				<div ref={(r) => (this._scrollRef = r)} className="relative flex-1 overflow-x-auto overflow-y-hidden" onMouseDown={(ev) => this._handleScrubStart(ev, layouts)}>
					<div
						ref={(r) => (this._contentRef = r)}
						className="relative h-full min-w-full"
						style={{
							width: `${contentMargin + width + 160}px`,
						}}
					>
						<CinematicEditorSequencesRuler
							layouts={layouts}
							scale={this.props.scale}
							framesCount={getCinematicFramesCount(cinematic)}
							framesPerSecond={cinematic.framesPerSecond}
						/>

						{layouts.map((layout, index) => this._getSequence(layout, index))}

						<button
							className={`
								absolute top-12 flex justify-center items-center w-28 h-28 rounded-xl
								border border-dashed border-foreground/20 text-muted-foreground
								hover:border-bjs-purple/50 hover:text-foreground hover:bg-secondary/40
								hover:shadow-[0_0_18px_-3px_rgba(147,121,230,0.45)]
								transition-[border-color,box-shadow,background-color,color] duration-200 ease-out
							`}
							style={{
								left: `${contentMargin + width + sequencesGap}px`,
							}}
							onMouseDown={(ev) => ev.stopPropagation()}
							onClick={() => this.addSequence()}
						>
							<AiOutlinePlus className="w-6 h-6" />
						</button>

						<CinematicEditorTracker
							ref={(r) => (this.tracker = r)}
							scale={this.props.scale}
							currentTime={this.props.currentTime}
							lineClassName="bg-muted-foreground"
							getPosition={(time) => getCinematicSequencesPositionAt(layouts, time)}
						/>
					</div>
				</div>
			</div>
		);
	}

	public componentDidMount(): void {
		window.addEventListener(
			"keydown",
			(this._keyDownListener = (event) => {
				this._handleKeyDown(event);
			})
		);
	}

	public componentWillUnmount(): void {
		if (this._keyDownListener) {
			window.removeEventListener("keydown", this._keyDownListener);
		}
	}

	/**
	 * Adds a new empty sequence at the end of the cinematic.
	 */
	public addSequence(): void {
		const sequences = this.props.cinematicEditor.cinematic.sequences;

		let index = sequences.length + 1;
		while (sequences.find((sequence) => sequence.name === `Sequence ${index}`)) {
			++index;
		}

		const sequence: ICinematicSequence = {
			name: `Sequence ${index}`,
			tracks: [],
		};

		registerUndoRedo({
			executeRedo: true,
			undo: () => {
				const index = sequences.indexOf(sequence);
				if (index !== -1) {
					sequences.splice(index, 1);
				}
			},
			redo: () => sequences.push(sequence),
		});

		this.setState({ selectedSequence: sequence }, () => {
			this._scrollRef?.scrollTo({ left: this._scrollRef.scrollWidth, behavior: "smooth" });
		});

		this.props.cinematicEditor.forceUpdate();
	}

	/**
	 * Removes the given sequence and its tracks from the cinematic.
	 * @param sequence defines the reference to the sequence to remove.
	 */
	public removeSequence(sequence: ICinematicSequence): void {
		const sequences = this.props.cinematicEditor.cinematic.sequences;

		const index = sequences.indexOf(sequence);
		if (index === -1) {
			return;
		}

		registerUndoRedo({
			executeRedo: true,
			undo: () => sequences.splice(index, 0, sequence),
			redo: () => sequences.splice(index, 1),
		});

		if (this.state.selectedSequence === sequence) {
			this.setState({ selectedSequence: null });
		}

		this.props.cinematicEditor.forceUpdate();
	}

	/**
	 * Moves the given sequence at the given index in the cinematic: the sequences after it play later.
	 * @param sequence defines the reference to the sequence to move.
	 * @param index defines the new index of the sequence.
	 */
	public moveSequence(sequence: ICinematicSequence, index: number): void {
		const sequences = this.props.cinematicEditor.cinematic.sequences;

		const oldIndex = sequences.indexOf(sequence);
		if (oldIndex === -1 || oldIndex === index) {
			return;
		}

		const move = (to: number): void => {
			sequences.splice(sequences.indexOf(sequence), 1);
			sequences.splice(to, 0, sequence);
		};

		registerUndoRedo({
			executeRedo: true,
			undo: () => move(oldIndex),
			redo: () => move(index),
		});

		this.props.cinematicEditor.forceUpdate();
	}

	/**
	 * Asks the new name of the given sequence and renames it.
	 * @param sequence defines the reference to the sequence to rename.
	 */
	public async renameSequence(sequence: ICinematicSequence): Promise<void> {
		const name = await showPrompt("Rename sequence", "Enter the new name of the sequence.", sequence.name);

		const oldName = sequence.name;
		const newName = name?.trim();

		if (!newName || newName === oldName) {
			return;
		}

		registerUndoRedo({
			executeRedo: true,
			undo: () => (sequence.name = oldName),
			redo: () => (sequence.name = newName),
		});

		this.props.cinematicEditor.forceUpdate();
	}

	/**
	 * Returns the sequences in the order they are displayed: while a sequence is dragged, where it would be dropped.
	 */
	private _getDisplayedSequences(): ICinematicSequence[] {
		const sequences = this.props.cinematicEditor.cinematic.sequences;
		const drag = this.state.drag;

		if (!drag) {
			return sequences;
		}

		const others = sequences.filter((sequence) => sequence !== drag.sequence);
		others.splice(drag.dropIndex, 0, drag.sequence);

		return others;
	}

	private _getSequence(layout: ICinematicSequenceLayout, index: number): ReactNode {
		const sequence = layout.sequence;
		const dragged = this.state.drag?.sequence === sequence;

		sequence._id ??= Tools.RandomId();

		return (
			<ContextMenu key={sequence._id}>
				<ContextMenuTrigger asChild>
					<div
						className={`
							absolute top-12 h-28
							${dragged ? "z-10 cursor-grabbing" : "cursor-grab hover:z-[5]"}
							${this.state.drag && !dragged ? "transition-[left] duration-150 ease-out" : ""}
						`}
						style={{
							left: `${contentMargin + (dragged ? this.state.drag!.x : layout.x) + sequencesGap * 0.5}px`,
							width: `${layout.width - sequencesGap}px`,
						}}
						onMouseDown={(ev) => this._handleSequenceMouseDown(ev, layout)}
						onDoubleClick={() => this.props.cinematicEditor.editSequence(sequence)}
					>
						<CinematicEditorSequence
							layout={layout}
							number={index + 1}
							dragged={dragged}
							framesPerSecond={this.props.cinematicEditor.cinematic.framesPerSecond}
							selected={this.state.selectedSequence === sequence}
						/>
					</div>
				</ContextMenuTrigger>

				<ContextMenuContent>
					<ContextMenuItem onClick={() => this.props.cinematicEditor.editSequence(sequence)}>Edit</ContextMenuItem>
					<ContextMenuItem onClick={() => this.renameSequence(sequence)}>Rename</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem className="flex items-center gap-2 !text-red-400" onClick={() => this.removeSequence(sequence)}>
						<AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Remove
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
		);
	}

	/**
	 * Selects the pressed sequence and drags it when the mouse moves: the other sequences make room where it will be dropped.
	 */
	private _handleSequenceMouseDown(event: MouseEvent<HTMLDivElement>, layout: ICinematicSequenceLayout): void {
		event.stopPropagation();

		if (event.button !== 0 || !this._contentRef) {
			return;
		}

		const sequence = layout.sequence;
		const startX = event.clientX;
		const grabOffset = event.clientX - this._contentRef.getBoundingClientRect().left - contentMargin - layout.x;

		const others = getCinematicSequencesLayout(
			this.props.cinematicEditor.cinematic.sequences.filter((s) => s !== sequence),
			this.props.scale
		);

		let dragging = false;

		this.setState({ selectedSequence: sequence });

		const mouseMoveListener = (ev: globalThis.MouseEvent): void => {
			if (!dragging && Math.abs(ev.clientX - startX) < dragThreshold) {
				return;
			}

			if (!this._contentRef || !this._scrollRef) {
				return;
			}

			if (!dragging) {
				dragging = true;
				document.body.style.cursor = "grabbing";
			}

			// Scroll when dragging close to the sides.
			const scrollBounds = this._scrollRef.getBoundingClientRect();
			if (ev.clientX > scrollBounds.right - 40) {
				this._scrollRef.scrollLeft += 20;
			} else if (ev.clientX < scrollBounds.left + 40) {
				this._scrollRef.scrollLeft -= 20;
			}

			const x = Math.max(0, ev.clientX - this._contentRef.getBoundingClientRect().left - contentMargin - grabOffset);

			this.setState({
				drag: {
					x,
					sequence,
					dropIndex: getCinematicSequenceDropIndex(others, x, layout.width),
				},
			});
		};

		const mouseUpListener = (): void => {
			document.body.removeEventListener("mousemove", mouseMoveListener);
			document.body.removeEventListener("mouseup", mouseUpListener);

			if (!dragging) {
				return;
			}

			document.body.style.cursor = "auto";

			const drag = this.state.drag;
			this.setState({ drag: null });

			if (drag) {
				this.moveSequence(sequence, drag.dropIndex);
			}
		};

		document.body.addEventListener("mousemove", mouseMoveListener);
		document.body.addEventListener("mouseup", mouseUpListener);
	}

	/**
	 * Moves the tracker where the mouse is pressed and while it moves, so the cinematic can be previewed quickly.
	 */
	private _handleScrubStart(event: MouseEvent<HTMLDivElement>, layouts: ICinematicSequenceLayout[]): void {
		if (event.button !== 0 || !this._contentRef) {
			return;
		}

		const cinematicEditor = this.props.cinematicEditor;

		const getFrame = (clientX: number): number => {
			const x = clientX - (this._contentRef?.getBoundingClientRect().left ?? 0) - contentMargin;
			return Math.round(getCinematicSequencesFrameAt(layouts, x));
		};

		this.setState({ selectedSequence: null });

		document.body.style.cursor = "ew-resize";

		cinematicEditor.createTemporaryAnimationGroup();
		cinematicEditor.setCurrentTime(getFrame(event.clientX));

		const mouseMoveListener = (ev: globalThis.MouseEvent): void => {
			cinematicEditor.setCurrentTime(getFrame(ev.clientX));
		};

		const mouseUpListener = (): void => {
			document.body.style.cursor = "auto";

			document.body.removeEventListener("mousemove", mouseMoveListener);
			document.body.removeEventListener("mouseup", mouseUpListener);

			cinematicEditor.disposeTemporaryAnimationGroup();
		};

		document.body.addEventListener("mousemove", mouseMoveListener);
		document.body.addEventListener("mouseup", mouseUpListener);
	}

	private _handleKeyDown(event: KeyboardEvent): void {
		const sequence = this.state.selectedSequence;

		if (!this._hovered || !sequence || isDomTextInputFocused() || event.metaKey || event.ctrlKey) {
			return;
		}

		switch (event.key) {
			case "Delete":
			case "Backspace":
				event.preventDefault();
				this.removeSequence(sequence);
				break;

			case "Enter":
				event.preventDefault();
				this.props.cinematicEditor.editSequence(sequence);
				break;
		}
	}
}
