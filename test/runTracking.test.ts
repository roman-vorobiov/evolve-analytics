import { describe, expect, it, jest } from "@jest/globals";
import { makeGameStateFactory, makeConfig, makeMilestones, makeView } from "./fixture";

import { Game } from "../src/game";
import { collectMilestones, trackMilestones } from "../src/runTracking";
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
    describe("Milestone collection", () => {
        it("should collect milestones from each view", () => {
            const config = makeConfig({
                views: [
                    makeView({
                        milestones: makeMilestones([
                            "built:city-apartment:1",
                            "built:space-spaceport:2"
                        ])
                    }),
                    makeView({
                        milestones: makeMilestones([
                            "built:interstellar-mining_droid:3",
                            "built:galaxy-dreadnought:4"
                        ])
                    })
                ]
            });

            expect(collectMilestones(config)).toEqual([
                "built:city-apartment:1",
                "built:space-spaceport:2",
                "built:interstellar-mining_droid:3",
                "built:galaxy-dreadnought:4"
            ]);
        });

        it("should not duplicate the same milestone", () => {
            const config = makeConfig({
                views: [
                    makeView({
                        milestones: makeMilestones([
                            "built:city-apartment:1",
                            "built:space-spaceport:2"
                        ])
                    }),
                    makeView({
                        milestones: makeMilestones([
                            "built:space-spaceport:2",
                            "built:galaxy-dreadnought:4"
                        ])
                    })
                ]
            });

            expect(collectMilestones(config)).toEqual([
                "built:city-apartment:1",
                "built:space-spaceport:2",
                "built:galaxy-dreadnought:4"
            ]);
        });

        it("should collect disabled milestones", () => {
            const config = makeConfig({
                views: [
                    makeView({
                        milestones: makeMilestones({
                            "built:city-apartment:1": { enabled: false },
                            "built:space-spaceport:2": { enabled: true }
                        })
                    })
                ]
            });

            expect(collectMilestones(config)).toEqual([
                "built:city-apartment:1",
                "built:space-spaceport:2"
            ]);
        });
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

        const currentRun = trackMilestones(game, config);

        nextDay(evolve);
        expect(currentRun.milestones).toEqual({});

        ++evolve.global.space.foo.count;
        ++evolve.global.space.bar.count;
        nextDay(evolve);
        expect(currentRun.milestones).toEqual({
            "built:space-foo:1": 2
        });

        ++evolve.global.space.foo.count;
        ++evolve.global.space.bar.count;
        nextDay(evolve);
        expect(currentRun.milestones).toEqual({
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

        const currentRun = trackMilestones(game, config);

        expect(currentRun.totalDays).toEqual(1);

        nextDay(evolve);
        expect(currentRun.totalDays).toEqual(2);

        config.recordRuns = false;

        nextDay(evolve);
        expect(currentRun.totalDays).toEqual(2);
    });

    it("should gather additional info", () => {
        const evolve = makeGameState({});
        const game = new Game(evolve);
        const config = makeConfig({ game }, {});

        const currentRun = trackMilestones(game, config);

        nextDay(evolve);
        expect(currentRun.raceName).toEqual("Foo");
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

        const currentRun = trackMilestones(game, config);

        nextDay(evolve);
        expect(currentRun.milestones).toEqual({});

        ++evolve.global.galaxy.scout_ship.count;
        nextDay(evolve);
        expect(currentRun.milestones).toEqual({
            "event_condition:alien": 2
        });

        evolve.global.tech.xeno = 1;
        nextDay(evolve);
        expect(currentRun.milestones).toEqual({
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

        const currentRun = trackMilestones(game, config);

        nextDay(evolve);
        expect(currentRun.milestones).toEqual({});
        expect(currentRun.activeEffects).toEqual({});
        expect(currentRun.effectsHistory).toEqual([]);

        evolve.global.race.inspired = 123;
        nextDay(evolve);
        expect(currentRun.milestones).toEqual({});
        expect(currentRun.activeEffects).toEqual({
            "effect:inspired": 3
        });
        expect(currentRun.effectsHistory).toEqual([]);

        nextDay(evolve);
        expect(currentRun.milestones).toEqual({});
        expect(currentRun.activeEffects).toEqual({
            "effect:inspired": 3
        });
        expect(currentRun.effectsHistory).toEqual([]);

        delete evolve.global.race.inspired;
        nextDay(evolve);
        expect(currentRun.milestones).toEqual({});
        expect(currentRun.activeEffects).toEqual({});
        expect(currentRun.effectsHistory).toEqual([
            ["effect:inspired", 3, 4]
        ]);
    });
});
