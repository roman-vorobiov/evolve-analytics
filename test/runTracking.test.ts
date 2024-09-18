import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { LocalStorageMock } from "./fixture";

import { loadLatestRun } from "../src/database";
import { Game } from "../src/game";
import { trackMilestones } from "../src/runTracking";
import { ConfigManager } from "../src/config";
import type { Evolve, BuildingInfoTabs } from "../src/evolve";
import type { Milestone } from "../src/milestones";

function nextDay(evolve: Evolve) {
    ++evolve.global.stats.days;

    evolve.craftCost = {};
}

function makeGameState(buildings: Partial<BuildingInfoTabs>): Evolve {
    return <Evolve> {
        global: {
            stats: {
                reset: 123,
                ascend: 1,
                days: 1
            },
            race: {
                universe: "standard"
            },
            ...buildings
        }
    };
}

function makeConfig(game: Game, milestones: Milestone[]): ConfigManager {
    return new ConfigManager(game, {
        version: 3,
        views: [
            {
                mode: "Total (filled)",
                resetType: "MAD",
                milestones
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
            ["Built", "space", "foo", "Foo", 1, true],
            ["Built", "space", "bar", "Bar", 2, true],
        ]);

        trackMilestones(game, config);

        nextDay(evolve);
        expect(loadLatestRun()?.milestones).toEqual({});

        ++evolve.global.space.foo.count;
        ++evolve.global.space.bar.count;
        nextDay(evolve);
        expect(loadLatestRun()?.milestones).toEqual({
            "Foo": 2
        });

        ++evolve.global.space.foo.count;
        ++evolve.global.space.bar.count;
        nextDay(evolve);
        expect(loadLatestRun()?.milestones).toEqual({
            "Foo": 2,
            "Bar": 3
        });
    });

    it("should not check already reached milestones", () => {
        const evolve = makeGameState({ space: { "foo": { count: 0 } } });
        const game = new Game(evolve);

        const mock = jest.spyOn(game, "built");

        const config = makeConfig(game, [
            ["Built", "space", "foo", "Foo", 1, true]
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
});
