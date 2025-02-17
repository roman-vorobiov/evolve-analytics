import { describe, expect, it, jest } from "@jest/globals";
import { makeGameStateFactory, makeConfig, makeMilestones, makeView } from "./fixture";

import { loadLatestRun } from "../src/database";
import { Game } from "../src/game";
import { trackMilestones } from "../src/runTracking";
import type { Evolve } from "../src/evolve";

const makeGameState = makeGameStateFactory({
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
        }
    }
});

function nextDay(evolve: Evolve) {
    ++evolve.global.stats.days;

    evolve.craftCost = {};
}

describe("Run tracking", () => {
    it("should save each day", () => {
        const evolve = makeGameState({});
        const game = new Game(evolve);
        const config = makeConfig({ game }, {});

        trackMilestones(game, config);

        expect(loadLatestRun()).toBe(null);

        nextDay(evolve);
        expect(loadLatestRun()?.totalDays).toEqual(2);

        nextDay(evolve);
        expect(loadLatestRun()?.totalDays).toEqual(3);
    });

    it("should timestamp milestones as they are reached", () => {
        const evolve = makeGameState({ global: { space: { "foo": { count: 0 }, "bar": { count: 0 } } } });
        const game = new Game(evolve);

        const config = makeConfig({ game }, {
            views: [
                makeView({
                    milestones: makeMilestones([
                        "built:space-foo:1",
                        "built:space-bar:2"
                    ])
                })
            ]
        });

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
        const evolve = makeGameState({ global: { space: { "foo": { count: 0 } } } });
        const game = new Game(evolve);

        const mock = jest.spyOn(game, "built");

        const config = makeConfig({ game }, {
            views: [
                makeView({
                    milestones: makeMilestones([
                        "built:space-foo:1"
                    ])
                })
            ]
        });

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
        const config = makeConfig({ game }, {});

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
        const config = makeConfig({ game }, {});

        trackMilestones(game, config);

        expect(loadLatestRun()).toBe(null);

        nextDay(evolve);
        expect(loadLatestRun()?.raceName).toEqual("Foo");
    });

    it("should track event preconditions", () => {
        const evolve = makeGameState({ global: { galaxy: { "scout_ship": { count: 0 } } } });
        const game = new Game(evolve);

        const config = makeConfig({ game }, {
            views: [
                makeView({
                    milestones: makeMilestones([
                        "event:alien"
                    ])
                })
            ]
        });

        trackMilestones(game, config);

        nextDay(evolve);
        expect(loadLatestRun()?.milestones).toEqual({});

        ++evolve.global.galaxy.scout_ship.count;
        nextDay(evolve);
        expect(loadLatestRun()?.milestones).toEqual({
            "event_condition:alien": 2
        });

        evolve.global.tech.xeno = 1;
        nextDay(evolve);
        expect(loadLatestRun()?.milestones).toEqual({
            "event_condition:alien": 2,
            "event:alien": 3
        });
    });

    it("should register new effects", () => {
        const evolve = makeGameState({ global: { race: { species: "foo", universe: "standard" } } });
        const game = new Game(evolve);

        const config = makeConfig({ game }, {
            views: [
                makeView({
                    milestones: makeMilestones([
                        "effect:inspired"
                    ])
                })
            ]
        });

        trackMilestones(game, config);

        nextDay(evolve);
        expect(loadLatestRun()?.milestones).toEqual({});
        expect(loadLatestRun()?.activeEffects).toEqual({});
        expect(loadLatestRun()?.effectsHistory).toEqual([]);

        evolve.global.race.inspired = 123;
        nextDay(evolve);
        expect(loadLatestRun()?.milestones).toEqual({});
        expect(loadLatestRun()?.activeEffects).toEqual({
            "effect:inspired": 3
        });
        expect(loadLatestRun()?.effectsHistory).toEqual([]);

        nextDay(evolve);
        expect(loadLatestRun()?.milestones).toEqual({});
        expect(loadLatestRun()?.activeEffects).toEqual({
            "effect:inspired": 3
        });
        expect(loadLatestRun()?.effectsHistory).toEqual([]);

        delete evolve.global.race.inspired;
        nextDay(evolve);
        expect(loadLatestRun()?.milestones).toEqual({});
        expect(loadLatestRun()?.activeEffects).toEqual({});
        expect(loadLatestRun()?.effectsHistory).toEqual([
            ["effect:inspired", 3, 4]
        ]);
    });
});
