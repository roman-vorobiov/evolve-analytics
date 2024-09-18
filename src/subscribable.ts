type Callback = (..._: any[]) => void;

export class Subscribable {
    callbacks: Record<string, WeakMap<WeakKey, Callback[]>>;

    constructor() {
        Object.defineProperty(this, "callbacks", {
            value: {},
            enumerable: false,
        });
    }

    on(event: string, key: WeakKey, callback: Callback): void;
    on(event: string, callback: Callback): void;
    on(event: string, ...args: [WeakKey, Callback] | [Callback]) {
        const [key, callback] = args.length === 2 ? args : [this, args[0]];

        const map = this.callbacks[event] ??= new WeakMap();
        const list = map.get(key) ?? (map.set(key, []), map.get(key)!);

        list.push(callback);
    }

    emit(event: string, arg?: any) {
        if (arg !== undefined) {
            this.invoke(event, arg, arg);
            this.invoke("*", arg, arg);
        }

        this.invoke(event, this, arg);
        this.invoke("*", this, arg);
    }

    private invoke(event: string, key: WeakKey, arg: any) {
        this.callbacks[event]?.get(key)?.forEach(cb => cb(arg));
    }
}
