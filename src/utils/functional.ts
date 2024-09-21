type Callback = (...args: any[]) => void;
type Decorator = (callback: Callback) => Callback;

class WeakCallback {
    static references = new WeakMap<WeakKey, Callback[]>();
    private impl: WeakRef<Callback>;

    constructor(key: WeakKey, impl: Callback) {
        (WeakCallback.references.get(key) ?? WeakCallback.references.set(key, []).get(key)!).push(impl);
        this.impl = new WeakRef(impl);
    }

    call(arg: any) {
        this.impl.deref()?.(arg);
    }
}

export function weakFor(ref: WeakKey): Decorator;
export function weakFor(ref: WeakKey, callback: Callback): Callback;
export function weakFor(ref: WeakKey, callback?: Callback): Callback {
    if (callback !== undefined) {
        const wrapper = new WeakCallback(ref, callback);
        return (arg: any) => wrapper.call(arg);
    }
    else {
        return (callback) => weakFor(ref, callback);
    }
}

export function invokeFor(ref: WeakKey): Decorator;
export function invokeFor(ref: WeakKey, callback: Callback): Callback;
export function invokeFor(ref: WeakKey, callback?: Callback): Callback {
    if (callback !== undefined) {
        const key = new WeakRef(ref);
        return (arg: any) => {
            if (arg === key.deref()) {
                callback(arg);
            }
        };
    }
    else {
        return (callback) => invokeFor(ref, callback);
    }
}

export function compose(decorators: Decorator[], callback: Callback) {
    let wrapper = callback;

    for (const decorator of decorators) {
        wrapper = decorator(callback);
    }

    return wrapper;
}
