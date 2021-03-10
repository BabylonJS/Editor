interface _InspectorNotification {
    /**
     * Defines the reference to the object to listen changes.
     */
    object: any;
    /**
     * Defines the callback called on the object has been changed and notified.
     */
    callback: () => void;

    /**
     * Defines the reference to the caller.
     * @hidden
     */
    caller: any;
}

export class InspectorNotifier {
    private static _NotificationId: number = 0;
    private static _Notifications: _InspectorNotification[] = [];

    /**
     * Notifies the inspectors that the given object has been notified.
     * @param object defines the reference to the object that has been changed.
     */
    public static NotifyChange<T>(object: T): void {
        this._Notifications.forEach((n) => {
            let effectiveObject = n.object;

            if (typeof(n.object) === "function") {
                effectiveObject = n.object();
            }

            if (effectiveObject === object) {
                n.callback();
            }
        })
    }

    /**
     * Registers the given callback when the given object has been changed.
     * @param object defines the reference to the object to listen changes.
     * @param callback defines the callback called on the object has been changed and notified.
     * @returns the id of the nofifier. Should be kept in order to unregister.
     */
    public static Register<T>(caller: any, object: T | (() => void), callback: () => void): number {
        this._NotificationId++;

        this._Notifications.push({ object, callback, caller: caller });
        return this._NotificationId;
    }

    /**
     * Unregisters the notifier identified by the given Id.
     * @param caller defines the reference to the original caller.
     */
    public static Unregister(caller: any): void {
        let index = -1;

        while ((index = this._Notifications.findIndex((n) => n.caller === caller)) !== -1) {
            this._Notifications.splice(index, 1);
        }
    }
}
