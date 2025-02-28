import { describe, expect, it, jest } from "@jest/globals";
import { makeGameState, makeConfig, makeHistory, makeCurrentRun } from "./fixture";

import { saveCurrentRun } from "../src/database";
import { Game } from "../src/game";
import { blankHistory } from "../src/history";
import { makeNewRunStats, prepareCurrentRun } from "../src/pendingRun";

describe("Pending run processing", () => {
    it("should create an empty run when the storage is empty", () => {
        const game = new Game(makeGameState({
            global: {
                stats: {
                    reset: 123,
                    cataclysm: 456
                },
                race: { universe: "antimatter" }
            }
        }));
        const config = makeConfig({ game }, {});
        const history = makeHistory({ game, config }, blankHistory());

        const currentRun = prepareCurrentRun(game, config, history);

        expect(currentRun).toEqual({
            run: game.runNumber,
            universe: game.universe,
            resets: game.resetCounts,
            totalDays: game.day,
            milestones: {},
            activeEffects: {},
            effectsHistory: []
        });

        expect(history.milestones).toEqual({});
        expect(history.milestoneIDs).toEqual({});
        expect(history.runs).toEqual([]);
    });

    it("should discard future milestones and effects if current run", () => {
        const run = makeCurrentRun({
            run: 123,
            totalDays: 456,
            milestones: { foo: 123, bar: 124 },
            activeEffects: { "effect:hot": 123, "effect:cold": 124 },
            effectsHistory: [
                ["effect:inspired", 0, 123],
                ["effect:motivated", 0, 124]
            ]
        });
        saveCurrentRun(run);

        const game = new Game(makeGameState({ global: { stats: { reset: 122, days: 123 } } }));
        const config = makeConfig({ game }, {});
        const history = makeHistory({ game, config }, blankHistory());

        jest.spyOn(history, "commitRun");
        const currentRun = prepareCurrentRun(game, config, history);

        expect(currentRun).toEqual({
            ...run,
            totalDays: 123,
            milestones: { foo: 123 },
            activeEffects: { "effect:hot": 123 },
            effectsHistory: [
                ["effect:inspired", 0, 123]
            ]
        });

        expect(history.commitRun).not.toHaveBeenCalled();
    });

    it("should commit the previous run to history", () => {
        const run = makeCurrentRun({ run: 123, totalDays: 456 });
        saveCurrentRun(run);

        const game = new Game(makeGameState({ global: { stats: { reset: 123, days: 456 } } }));
        const config = makeConfig({ game }, {});
        const history = makeHistory({ game, config }, blankHistory());

        jest.spyOn(history, "commitRun");
        const currentRun = prepareCurrentRun(game, config, history);

        expect(currentRun).toEqual(makeNewRunStats(game));

        expect(history.commitRun).toHaveBeenCalledWith(run);
    });

    it("should not commit the run to history if recording is disabled", () => {
        const run = makeCurrentRun({ run: 123, totalDays: 456 });

        saveCurrentRun(run);

        const game = new Game(makeGameState({ global: { stats: { reset: 123, days: 456 } } }));
        const config = makeConfig({ game }, { recordRuns: false });
        const history = makeHistory({ game, config }, blankHistory());

        jest.spyOn(history, "commitRun");
        const currentRun = prepareCurrentRun(game, config, history);

        expect(currentRun).toEqual(makeNewRunStats(game));

        expect(history.commitRun).not.toHaveBeenCalled();
    });

    it("should not commit other runs to history", () => {
        const run = makeCurrentRun({ run: 123, totalDays: 456 });
        saveCurrentRun(run);

        const game = new Game(makeGameState({ global: { stats: { reset: 125, days: 456 } } }));
        const config = makeConfig({ game }, {});
        const history = makeHistory({ game, config }, blankHistory());

        jest.spyOn(history, "commitRun");
        const currentRun = prepareCurrentRun(game, config, history);

        expect(currentRun).toEqual(makeNewRunStats(game));

        expect(history.commitRun).not.toHaveBeenCalled();
    });
});
