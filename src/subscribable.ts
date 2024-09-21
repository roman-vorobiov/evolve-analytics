type Callback = (..._: any[]) => void;

export class Subscribable {
    callbacks: Record<string, Callback[]> = {};

    on(event: string, callback: Callback) {
        (this.callbacks[event] ??= []).push(callback);
    }

    emit(event: string, arg: any) {
        this.invoke(event, arg);
        this.invoke("*", arg);
    }

    private invoke(event: string, arg: any) {
        this.callbacks[event]?.forEach(cb => cb(arg));
    }
}
