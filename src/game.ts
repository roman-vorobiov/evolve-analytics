import { resets } from "./enums";
import { transformMap } from "./utils";
import type { Evolve, BuildingInfoTabs, ArpaInfoTab } from "./evolve";

import type { default as JQuery } from "jquery";

declare const $: typeof JQuery;

export class Game {
    constructor(private evolve: Evolve) {}

    get runNumber() {
        return this.evolve.global.stats.reset + 1;
    }

    get day() {
        return this.evolve.global.stats.days;
    }

    get universe() {
        return this.evolve.global.race.universe;
    }

    get raceName() {
        return this.evolve.races[this.evolve.global.race.species].name;
    }

    get finishedEvolution() {
        return this.evolve.global.race.species !== "protoplasm"
    }

    get resetCounts(): Record<keyof typeof resets, number> {
        return transformMap(resets, ([reset]) => [reset, this.evolve.global.stats[reset] ?? 0]);
    }

    built(tab: string, building: string, count: number) {
        const instance: any = this.evolve.global[tab as keyof (BuildingInfoTabs & ArpaInfoTab)]?.[building];
        const instanceCount = tab === "arpa" ? instance?.rank : instance?.count;
        return (instanceCount ?? 0) >= count;
    }

    researched(tech: string) {
        return $(`#tech-${tech} .oldTech`).length !== 0;
    }

    womlingsArrived() {
        return this.evolve.global.race.servants !== undefined;
    }

    onGameDay(fn: (day: number) => void) {
        let previousDay: number | null = null;
        this.onGameTick(() => {
            const day = this.day;

            if (previousDay !== day) {
                fn(day);
                previousDay = day;
            }
        });
    }

    private onGameTick(fn: () => void) {
        let craftCost = this.evolve.craftCost;
        Object.defineProperty(this.evolve, "craftCost", {
            get: () => craftCost,
            set: (value) => {
                craftCost = value;
                fn();
            }
        });
    }
}
