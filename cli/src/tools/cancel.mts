export class CancellationToken {
	private _isCanceled: boolean = false;

	public cancel(): void {
		this._isCanceled = true;
	}

	public get isCanceled(): boolean {
		return this._isCanceled;
	}
}
