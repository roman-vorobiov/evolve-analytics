import type { resets } from "./enums";

declare const unsafeWindow: any;

export type BuildingInfoTabs = {
    [k in "city" | "space" | "interstellar" | "galaxy" | "portal"]: Record<string, {
        count: number;
    }>
}

export type ArpaInfoTab = {
    arpa: Record<string, {
        rank: number
    }>
}

export type Evolve = {
    craftCost: any,
    global: BuildingInfoTabs & ArpaInfoTab & {
        stats: { [k in keyof typeof resets]: number } & {
            reset: number,
            days: number
        },
        race: {
            universe: string,
            servants?: object
        }
    }
}

export function synchronize(): Promise<Evolve> {
    const win = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;

    return new Promise(resolve => {
        function impl() {
            if (win.evolve?.global?.stats !== undefined) {
                resolve(win.evolve);
            }
            else {
                setTimeout(impl, 100);
            }
        }

        impl();
    });
}
