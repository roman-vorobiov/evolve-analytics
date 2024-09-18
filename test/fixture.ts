import type { Evolve } from "../src/evolve";

export class LocalStorageMock {
    store: Record<string, string>;

    constructor() {
        this.store = {};
    }

    clear() {
        this.store = {};
    }

    getItem(key: string): string | null {
        return this.store[key] ?? null;
    }

    setItem(key: string, value: string) {
        this.store[key] = String(value);
    }

    removeItem(key: string) {
        delete this.store[key];
    }
}

export function makeGameState(stats: Partial<Evolve["global"]["stats"]>): Evolve {
    return <Evolve> {
        global: {
            race: {
                universe: "standard"
            },
            stats
        }
    }
}
