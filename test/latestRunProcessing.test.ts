import { describe, expect, it, beforeEach, afterEach, jest } from "@jest/globals";
import { LocalStorageMock, makeGameState } from "./fixture";

import { saveCurrentRun, loadLatestRun, loadHistory } from "../src/database";
import { Game } from "../src/game";
import { ConfigManager, type Config } from "../src/config";
import { HistoryManager, blankHistory } from "../src/history";
import { LatestRun, processLatestRun } from "../src/runTracking";

function makeConfig(game: Game, options?: Partial<Config>): ConfigManager {
    return new ConfigManager(game, {
        version: 5,
        recordRuns: true,
        views: [],
        ...(options ?? {})
    });
}

describe("Latest run", () => {
    beforeEach(() => {
        Object.defineProperty(global, "localStorage", {
            configurable: true,
            value: new LocalStorageMock()
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("Processing on script initialization", () => {
        describe("Empty state", () => {
            const game = new Game(makeGameState({}));
            const config = makeConfig(game);
            const history = new HistoryManager(game, config, blankHistory());

            beforeEach(() => {
                processLatestRun(game, config, history);
            });

            it("should not change the latest run storage", () => {
                expect(loadLatestRun()).toBe(null);
            });

            it("should not update the history", () => {
                expect(history.milestones).toEqual({});
                expect(history.milestoneIDs).toEqual({});
                expect(history.runs).toEqual([]);

                expect(loadHistory()).toBe(null);
            });
        });

        describe("Current run", () => {
            const run: LatestRun = {
                run: 123,
                universe: "standard",
                resets: {},
                totalDays: 456,
                milestones: { foo: 123, bar: 234 },
                activeEffects: {},
                effectsHistory: [],
            };

            let game: Game;
            let config: ConfigManager;
            let history: HistoryManager;

            beforeEach(() => {
                game = new Game(makeGameState({ reset: 122, days: 123 }));
                config = makeConfig(game);
                history = new HistoryManager(game, config, blankHistory());

                jest.spyOn(history, "commitRun");

                saveCurrentRun(run);

                processLatestRun(game, config, history);
            });

            it("should not commit the run to history", () => {
                expect(history.commitRun).not.toHaveBeenCalled();
                expect(loadHistory()).toBe(null);
            });

            it("should discard future milestones", () => {
                expect(loadLatestRun()).toEqual({
                    ...run,
                    totalDays: 123,
                    milestones: { foo: 123 }
                });
            });
        });

        describe("Previous run", () => {
            const run: LatestRun = {
                run: 123,
                universe: "standard",
                resets: {},
                totalDays: 456,
                milestones: {},
                activeEffects: {},
                effectsHistory: [],
            };

            let game: Game;
            let config: ConfigManager;
            let history: HistoryManager;

            beforeEach(() => {
                game = new Game(makeGameState({ reset: 123, days: 456 }));
                config = makeConfig(game);
                history = new HistoryManager(game, config, blankHistory());

                jest.spyOn(history, "commitRun");

                saveCurrentRun(run);

                processLatestRun(game, config, history);
            });

            it("should discard the run", () => {
                expect(loadLatestRun()).toBe(null);
            });

            it("should commit the run to history", () => {
                expect(history.commitRun).toHaveBeenCalledWith(run);
                expect(loadHistory()).not.toBe(null);
            });
        });

        describe("Paused", () => {
            const run: LatestRun = {
                run: 123,
                universe: "standard",
                resets: {},
                totalDays: 456,
                milestones: {},
                activeEffects: {},
                effectsHistory: [],
            };

            let game: Game;
            let config: ConfigManager;
            let history: HistoryManager;

            beforeEach(() => {
                game = new Game(makeGameState({ reset: 123, days: 456 }));
                config = makeConfig(game, { recordRuns: false });
                history = new HistoryManager(game, config, blankHistory());

                jest.spyOn(history, "commitRun");

                saveCurrentRun(run);

                processLatestRun(game, config, history);
            });

            it("should discard the run", () => {
                expect(loadLatestRun()).toBe(null);
            });

            it("should not commit the run to history", () => {
                expect(history.commitRun).not.toHaveBeenCalled();
                expect(loadHistory()).toBe(null);
            });
        });

        describe("Other run", () => {
            const run: LatestRun = {
                run: 123,
                universe: "standard",
                resets: {},
                totalDays: 456,
                milestones: {},
                activeEffects: {},
                effectsHistory: [],
            };

            let game: Game;
            let config: ConfigManager;
            let history: HistoryManager;

            beforeEach(() => {
                game = new Game(makeGameState({ reset: 125, days: 456 }));
                config = makeConfig(game);
                history = new HistoryManager(game, config, blankHistory());

                jest.spyOn(history, "commitRun");

                saveCurrentRun(run);

                processLatestRun(game, config, history);
            });

            it("should discard the run", () => {
                expect(loadLatestRun()).toBe(null);
            });

            it("should not commit the run to history", () => {
                expect(history.commitRun).not.toHaveBeenCalled();
                expect(loadHistory()).toBe(null);
            });
        });
    });
});
