type Callback = (..._: any[]) => void;

export class Subscribable {
    callbacks: Record<string, Callback[]>;

    constructor() {
        Object.defineProperty(this, "callbacks", {
            value: {},
            enumerable: false,
        });
    }

    on(event: string, callback: Callback) {
        (this.callbacks[event] ??= []).push(callback);
        return callback;
    }

    unsubscribe(callback: Callback) {
        for (const callbacks of Object.values(this.callbacks)) {
            const idx = callbacks.indexOf(callback);
            if (idx !== -1) {
                callbacks.splice(idx, 1);
                break;
            }
        }
    }

    emit(event: string, ...args: any[]) {
        console.log(...args);

        this.callbacks[event]?.forEach(cb => cb(...args));
        this.callbacks["*"]?.forEach(cb => cb(...args));
    }
}
