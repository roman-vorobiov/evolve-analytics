import { resets } from "./enums";
import { transformMap } from "./utils";
import { Subscribable } from "./subscribable";
import type { Evolve, BuildingInfoTabs, ArpaInfoTab } from "./evolve";

import type { default as JQuery } from "jquery";

declare const $: typeof JQuery;

export class Game extends Subscribable {
    private subscribed = false;

    constructor(private evolve: Evolve) {
        super();
    }

    get runNumber() {
        return this.evolve.global.stats.reset + 1;
    }

    get day() {
        return this.evolve.global.stats.days;
    }

    get universe() {
        const value = this.evolve.global.race.universe;
        if (value !== "bigbang") {
            return value;
        }
    }

    get raceName() {
        if (this.finishedEvolution) {
            return this.evolve.races[this.evolve.global.race.species].name;
        }
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

    steelDiscovered() {
        return this.evolve.global.resource.Steel.display;
    }

    eleriumDiscovered() {
        return this.evolve.global.resource.Elerium.display;
    }

    spaceOilDiscovered() {
        return this.evolve.global.tech["gas_moon"] >= 2;
    }

    pitDiscovered() {
        return this.evolve.global.tech["hell_pit"] >= 1;
    }

    aliensEncountered() {
        return this.evolve.global.tech["xeno"] >= 1;
    }

    piratesEncountered() {
        return this.evolve.global.tech["piracy"] >= 1;
    }

    alienDatabaseFound() {
        return this.evolve.global.tech["conflict"] >= 5;
    }

    corruptSoulGemProduced() {
        return this.evolve.global.tech["corrupt"] >= 1;
    }

    vaultDiscovered() {
        return this.evolve.global.tech["hell_vault"] >= 1;
    }

    syndicateEncountered() {
        return this.evolve.global.tech["syndicate"] >= 1;
    }

    onGameDay(fn: (day: number) => void) {
        this.on("newDay", fn);

        if (!this.subscribed) {
            this.subscribeToGameUpdates();
            this.subscribed = true;
        }
    }

    private subscribeToGameUpdates() {
        let previousDay: number | null = null;
        this.onGameTick(() => {
            const day = this.day;

            if (previousDay !== day) {
                this.emit("newDay", this.day);

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
