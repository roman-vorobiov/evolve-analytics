import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { makeGameState, makeConfig, makeHistory, makeCurrentRun } from "./fixture";

import { saveCurrentRun, loadLatestRun, loadHistory } from "../src/database";
import { Game } from "../src/game";
import { ConfigManager } from "../src/config";
import { HistoryManager, blankHistory } from "../src/history";
import { processLatestRun } from "../src/runTracking";

describe("Latest run", () => {
    describe("Processing on script initialization", () => {
        describe("Empty state", () => {
            const game = new Game(makeGameState({}));
            const config = makeConfig({ game }, {});
            const history = makeHistory({ game, config }, blankHistory());

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
            const run = makeCurrentRun({
                run: 123,
                totalDays: 456,
                milestones: { foo: 123, bar: 234 }
            });

            let game: Game;
            let config: ConfigManager;
            let history: HistoryManager;

            beforeEach(() => {
                game = new Game(makeGameState({ global: { stats: { reset: 122, days: 123 } } }));
                config = makeConfig({ game }, {});
                history = makeHistory({ game, config }, blankHistory());

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
            const run = makeCurrentRun({ run: 123, totalDays: 456 });

            let game: Game;
            let config: ConfigManager;
            let history: HistoryManager;

            beforeEach(() => {
                game = new Game(makeGameState({ global: { stats: { reset: 123, days: 456 } } }));
                config = makeConfig({ game }, {});
                history = makeHistory({ game, config }, blankHistory());

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
            const run = makeCurrentRun({ run: 123, totalDays: 456 });

            let game: Game;
            let config: ConfigManager;
            let history: HistoryManager;

            beforeEach(() => {
                game = new Game(makeGameState({ global: { stats: { reset: 123, days: 456 } } }));
                config = makeConfig({ game }, { recordRuns: false });
                history = makeHistory({ game, config }, blankHistory());

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
            const run = makeCurrentRun({ run: 123, totalDays: 456 });

            let game: Game;
            let config: ConfigManager;
            let history: HistoryManager;

            beforeEach(() => {
                game = new Game(makeGameState({ global: { stats: { reset: 125, days: 456 } } }));
                config = makeConfig({ game }, {});
                history = makeHistory({ game, config }, blankHistory());

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
