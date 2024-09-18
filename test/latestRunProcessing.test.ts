import { describe, expect, it, beforeEach, afterEach, jest } from "@jest/globals";
import { LocalStorageMock, makeGameState } from "./fixture";

import { saveCurrentRun, loadLatestRun, loadHistory } from "../src/database";
import { Game } from "../src/game";
import { HistoryManager, blankHistory } from "../src/history";
import { LatestRun, processLatestRun } from "../src/runTracking";

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
            const history = new HistoryManager(game, blankHistory());

            beforeEach(() => {
                processLatestRun(game, history);
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
            const run: LatestRun = { run: 123, universe: "standard", resets: {}, totalDays: 456, milestones: {} };

            let game: Game;
            let history: HistoryManager;

            beforeEach(() => {
                game = new Game(makeGameState({ reset: 122, days: 456 }));
                history = new HistoryManager(game, blankHistory());

                jest.spyOn(history, "commitRun");

                saveCurrentRun(run);

                processLatestRun(game, history);
            });

            it("should not discard the run", () => {
                expect(loadLatestRun()).toEqual(run);
            });

            it("should not commit the run to history", () => {
                expect(history.commitRun).not.toHaveBeenCalled();
                expect(loadHistory()).toBe(null);
            });
        });

        describe("Previous run", () => {
            const run: LatestRun = { run: 123, universe: "standard", resets: {}, totalDays: 456, milestones: {} };

            let game: Game;
            let history: HistoryManager;

            beforeEach(() => {
                game = new Game(makeGameState({ reset: 123, days: 456 }));
                history = new HistoryManager(game, blankHistory());

                jest.spyOn(history, "commitRun");

                saveCurrentRun(run);

                processLatestRun(game, history);
            });

            it("should discard the run", () => {
                expect(loadLatestRun()).toBe(null);
            });

            it("should commit the run to history", () => {
                expect(history.commitRun).toHaveBeenCalledWith(run);
                expect(loadHistory()).not.toBe(null);
            });
        });

        describe("Other run", () => {
            const run: LatestRun = { run: 123, universe: "standard", resets: {}, totalDays: 456, milestones: {} };

            let game: Game;
            let history: HistoryManager;

            beforeEach(() => {
                game = new Game(makeGameState({ reset: 125, days: 456 }));
                history = new HistoryManager(game, blankHistory());

                jest.spyOn(history, "commitRun");

                saveCurrentRun(run);

                processLatestRun(game, history);
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
