import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { LocalStorageMock } from "./fixture";

import { loadLatestRun } from "../src/database";
import { Game } from "../src/game";
import { trackMilestones } from "../src/runTracking";
import { ConfigManager, type ViewConfig } from "../src/config";
import type { Evolve, BuildingInfoTabs } from "../src/evolve";

function nextDay(evolve: Evolve) {
    ++evolve.global.stats.days;

    evolve.craftCost = {};
}

function makeGameState(buildings: Partial<BuildingInfoTabs>): Evolve {
    return {
        races: {
            foo: { name: "Foo" }
        },
        global: {
            stats: {
                reset: 123,
                ascend: 1,
                days: 1
            },
            race: {
                species: "foo",
                universe: "standard"
            },
            ...buildings
        }
    } as any as Evolve;
}

function makeConfig(game: Game, milestones: string[]): ConfigManager {
    return new ConfigManager(game, {
        version: 4,
        recordRuns: true,
        views: [
            {
                mode: "timestamp",
                showBars: false,
                showLines: true,
                fillArea: true,
                smoothness: 0,
                resetType: "mad",
                milestones: Object.fromEntries(milestones?.map(m => [m, true]) ?? []),
                additionalInfo: []
            }
        ]
    });
}

describe("Run tracking", () => {
    beforeEach(() => {
        Object.defineProperty(global, "localStorage", {
            configurable: true,
            value: new LocalStorageMock()
        });
    });

    it("should save each day", () => {
        const evolve = makeGameState({});
        const game = new Game(evolve);
        const config = makeConfig(game, []);

        trackMilestones(game, config);

        expect(loadLatestRun()).toBe(null);

        nextDay(evolve);
        expect(loadLatestRun()?.totalDays).toEqual(2);

        nextDay(evolve);
        expect(loadLatestRun()?.totalDays).toEqual(3);
    });

    it("should timestamp milestones as they are reached", () => {
        const evolve = makeGameState({ space: { "foo": { count: 0 }, "bar": { count: 0 } } });
        const game = new Game(evolve);

        const config = makeConfig(game, [
            "built:space-foo:1",
            "built:space-bar:2"
        ]);

        trackMilestones(game, config);

        nextDay(evolve);
        expect(loadLatestRun()?.milestones).toEqual({});

        ++evolve.global.space.foo.count;
        ++evolve.global.space.bar.count;
        nextDay(evolve);
        expect(loadLatestRun()?.milestones).toEqual({
            "built:space-foo:1": 2
        });

        ++evolve.global.space.foo.count;
        ++evolve.global.space.bar.count;
        nextDay(evolve);
        expect(loadLatestRun()?.milestones).toEqual({
            "built:space-foo:1": 2,
            "built:space-bar:2": 3
        });
    });

    it("should not check already reached milestones", () => {
        const evolve = makeGameState({ space: { "foo": { count: 0 } } });
        const game = new Game(evolve);

        const mock = jest.spyOn(game, "built");

        const config = makeConfig(game, [
            "built:space-foo:1"
        ]);

        trackMilestones(game, config);

        nextDay(evolve);
        expect(mock).toHaveBeenCalledTimes(1);

        ++evolve.global.space.foo.count;
        nextDay(evolve);
        expect(mock).toHaveBeenCalledTimes(2);

        nextDay(evolve);
        expect(mock).toHaveBeenCalledTimes(2);
    });

    it("should not do anything when paused", () => {
        const evolve = makeGameState({});
        const game = new Game(evolve);
        const config = makeConfig(game, []);

        trackMilestones(game, config);

        expect(loadLatestRun()).toBe(null);

        nextDay(evolve);
        expect(loadLatestRun()?.totalDays).toEqual(2);

        config.recordRuns = false;

        nextDay(evolve);
        expect(loadLatestRun()?.totalDays).toEqual(2);
    });

    it("should gather additional info", () => {
        const evolve = makeGameState({});
        const game = new Game(evolve);
        const config = makeConfig(game, []);

        trackMilestones(game, config);

        expect(loadLatestRun()).toBe(null);

        nextDay(evolve);
        expect(loadLatestRun()?.raceName).toEqual("Foo");
    });
});
