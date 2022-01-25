import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { AbstractAssets } from "../../assets/abstract-assets";

import { _IDragAndDroppedItem } from "../../components/graph";
import { AssetsBrowserItemHandler } from "../../components/assets-browser/files/item-handler";

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

    /**
     * @hidden
     */
    _timeoutId: Nullable<number>;
}

export interface IInspectorNotifierChangeOptions {
    /**
     * Defines the caller that notifies the change. This is typically used to don't listen themselves.
     */
    caller?: any;
    /**
     * Defines the optional time in milliseconds to wait before notifying changes.
     */
    waitMs?: number;
}

export class InspectorNotifier {
    private static _NotificationId: number = 0;
    private static _Notifications: _InspectorNotification[] = [];

    /**
     * Notifies the inspectors that the given object has been notified.
     * @param object defines the reference to the object that has been changed.
     * @param caller defines the caller that notifies the change. This is typically used to don't listen themselves;
     */
    public static NotifyChange<T>(object: T, options: IInspectorNotifierChangeOptions = {}): void {
        // Do not call ourself
        if (options.caller === this) {
            return;
        }

        // Notify!
        this._Notifications.forEach((n) => {
            if (n.caller === options.caller) {
                return;
            }

            let effectiveObject = n.object;

            if (typeof (n.object) === "function") {
                effectiveObject = n.object();
            }

            if (effectiveObject !== object) {
                return;
            }

            if (options.waitMs && options.waitMs > 0) {
                if (n._timeoutId !== null) {
                    clearTimeout(n._timeoutId);
                    n._timeoutId = null;
                }

                n._timeoutId = setTimeout(() => n.callback(), options.waitMs) as any;
            } else {
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

        this._Notifications.push({ object, callback, caller: caller, _timeoutId: null });
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

    public static _DragAndDroppedGraphItem: Nullable<_IDragAndDroppedItem> = null;
    public static _DragAndDroppedAssetItem: Nullable<AssetsBrowserItemHandler> = null;

    /**
     * Called on the user drops the asset in a supported inspector field.
     * @param ev defiens the reference to the event object.
     * @param object defines the reference to the object being modified in the inspector.
     * @param property defines the property of the object to assign the asset instance.
     */
    public static async NotifyOnDrop(ev: React.DragEvent<HTMLElement>, object: any, property: string): Promise<boolean> {
        if (this._DragAndDroppedAssetItem) {
            await this._DragAndDroppedAssetItem.onDropInInspector(ev, object, property);
            return true;
        }

        if (this._DragAndDroppedGraphItem) {
            await this._DragAndDroppedGraphItem.onDropInInspector(ev, object, property);
            return true;
        }

        if (AbstractAssets._DragAndDroppedItem) {
            await AbstractAssets._DragAndDroppedItem.onDropInInspector(ev, object, property);
            return true;
        }

        return false;
    }
}
