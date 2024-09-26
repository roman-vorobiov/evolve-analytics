import type { resets, universes } from "./enums";

declare const unsafeWindow: any;

export type BuildingInfoTabs = {
    [tab in "city" | "space" | "starDock" | "interstellar" | "galaxy" | "portal" | "tauceti"]: Record<string, {
        count: number;
    }>
}

export type ArpaInfoTab = {
    arpa: Record<string, {
        rank: number
    }>
}

export type Evolve = {
    craftCost?: any,
    races: Record<string, { name: string }>,
    global: BuildingInfoTabs & ArpaInfoTab & {
        stats: { [k in keyof typeof resets]: number } & {
            reset: number,
            days: number
        },
        race: {
            species: string,
            universe: keyof typeof universes,
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
