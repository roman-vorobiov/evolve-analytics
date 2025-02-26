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
    races: Record<string, { name: string, traits: Record<string, number> }>,
    traits: Record<string, { name: string, type: string, val: number }>,
    global: BuildingInfoTabs & ArpaInfoTab & {
        stats: { [k in keyof typeof resets]: number } & {
            reset: number,
            days: number,
            dkills: number,
            died: number
        },
        race: Record<string, any> & {
            species: string,
            universe: keyof typeof universes | "bigbang",
            servants?: object
        },
        resource: Record<string, { display: boolean }>,
        tech: Record<string, number>,
        city: {
            calendar: {
                temp: number
            }
        }
    }
}

export const enum EvolveTabs {
    Evolution = 0,
    Civilization = 1,
    Civics = 2,
    Research = 3,
    Resources = 4,
    Arpa = 5,
    Stats = 6,
    Settings = 7,
    HellObservations = 8,
    Analytics = 9
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
