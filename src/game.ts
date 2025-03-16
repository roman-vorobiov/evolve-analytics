import * as polyfill from "./polyfill";
import { resets, challengeGenes } from "./enums";
import { spy, transformMap } from "./utils";
import type { Temperature } from "./enums";
import type { Evolve, BuildingInfoTabs, ArpaInfoTab } from "./evolve";

export class Game {
    constructor(private evolve: Evolve) {}

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

    async waitEvolved() {
        return new Promise<void>(resolve => {
            if (this.finishedEvolution) {
                resolve();
            }
            else {
                this.onGameTick(() => {
                    if (this.finishedEvolution) {
                        resolve();
                    }
                });
            }
        })
    }

    get resetCounts(): Record<keyof typeof resets, number> {
        return transformMap(resets, ([reset]) => [reset, this.evolve.global.stats[reset] ?? 0]);
    }

    get combatDeaths() {
        return this.evolve.global.stats.died ?? 0;
    }

    get temperature(): Temperature {
        switch (this.evolve.global.city.calendar.temp) {
            case 2:
                return "hot";
            case 0:
                return "cold";
            default:
                return "normal"
        }
    }

    get inspired() {
        return (this.evolve.global.race.inspired ?? 0) !== 0;
    }

    get motivated() {
        return (this.evolve.global.race.motivated ?? 0) !== 0;
    }

    hasChallengeGene(gene: keyof typeof challengeGenes) {
        return gene in this.evolve.global.race;
    }

    traitName(trait: string) {
        return this.evolve.traits[trait]?.name ?? "Unknown";
    }

    traitValue(trait: string) {
        return this.evolve.traits[trait].val;
    }

    currentTraitRank(trait: string): number {
        return this.evolve.global.race[trait] as number;
    }

    baseTraitRank(trait: string): number {
        return this.evolve.races[this.evolve.global.race.species].traits[trait] as number;
    }

    get majorTraits() {
        return Object.keys(this.evolve.global.race).filter(k => this.evolve.traits[k]?.type === "major");
    }

    get imitatedTraits() {
        if ("srace" in this.evolve.global.race) {
            return Object.keys(this.evolve.races[this.evolve.global.race.srace].traits);
        }
        else {
            return [];
        }
    }

    get starLevel() {
        if (this.finishedEvolution) {
            return Object.keys(challengeGenes).filter(c => this.hasChallengeGene(c as keyof typeof challengeGenes)).length;
        }
    }

    built(tab: string, building: string, count: number) {
        const instance: any = this.evolve.global[tab as keyof (BuildingInfoTabs & ArpaInfoTab)]?.[building];
        const instanceCount = tab === "arpa" ? instance?.rank : instance?.count;
        return (instanceCount ?? 0) >= count;
    }

    researched(tech: string) {
        return polyfill.checkOldTech(this.evolve, tech);
    }

    womlingsArrived() {
        return this.evolve.global.race.servants !== undefined;
    }

    resourceUnlocked(resource: string) {
        return this.evolve.global.resource[resource]?.display ?? false;
    }

    techLevel(tech: string) {
        return this.evolve.global.tech[tech] ?? 0;
    }

    demonKills() {
        return this.evolve.global.stats.dkills ?? 0;
    }

    onGameDay(fn: (day: number) => void) {
        let previousDay: number | null = null;
        this.onGameTick(() => {
            const day = this.day;

            if (previousDay !== day) {
                previousDay = day;
                fn(day);
            }
        });
    }

    private onGameTick(fn: () => void) {
        spy(this.evolve, "craftCost", fn);
    }
}
