import { describe, expect, it, beforeEach } from "@jest/globals";
import { LocalStorageMock, makeGameState } from "./fixture";

import { loadHistory } from "../src/database";
import { Game } from "../src/game";
import { HistoryManager, blankHistory, type HistoryEntry } from "../src/history";

describe("History", () => {
    beforeEach(() => {
        Object.defineProperty(global, "localStorage", {
            configurable: true,
            value: new LocalStorageMock()
        });
    });

    describe("New entry", () => {
        it("should update the storage", () => {
            const game = new Game(makeGameState({ bioseed: 1 }));
            const history = new HistoryManager(game, blankHistory());

            history.commitRun({ run: 123, universe: "standard", resets: {}, totalDays: 456, milestones: {} });

            expect(loadHistory()).not.toBe(null);
        });

        it("should add the reset point as a milestone", () => {
            const game = new Game(makeGameState({ bioseed: 1 }));
            const history = new HistoryManager(game, blankHistory());

            history.commitRun({ run: 123, universe: "standard", resets: {}, totalDays: 456, milestones: {} });

            expect(history.milestones).toEqual({ [0]: "reset:bioseed" });
            expect(history.milestoneIDs).toEqual({ "reset:bioseed": 0 });

            expect(history.runs.length).toBe(1);
            expect(history.runs[0]).toEqual(<HistoryEntry> {
                run: 123,
                universe: "standard",
                milestones: [
                    [0, 456]
                ]
            });
        });

        it("should reuse existing milestone IDs", () => {
            const game = new Game(makeGameState({ bioseed: 1 }));
            const history = new HistoryManager(game, {
                milestones: {
                    "reset:bioseed": 789
                },
                runs: []
            });

            history.commitRun({ run: 123, universe: "standard", resets: {}, totalDays: 456, milestones: {} });

            expect(history.milestones).toEqual({ [789]: "reset:bioseed" });
            expect(history.milestoneIDs).toEqual({ "reset:bioseed": 789 });

            expect(history.runs.length).toBe(1);
            expect(history.runs[0]).toEqual(<HistoryEntry> {
                run: 123,
                universe: "standard",
                milestones: [
                    [789, 456]
                ]
            });
        });

        it("should add all milestones", () => {
            const game = new Game(makeGameState({ bioseed: 1 }));
            const history = new HistoryManager(game, {
                milestones: {
                    "tech:club": 0
                },
                runs: []
            });

            history.commitRun({ run: 123, universe: "standard", resets: {}, totalDays: 456, milestones: { "tech:club": 10, "built:city-shed:1": 20 } });

            expect(history.milestones).toEqual({
                [0]: "tech:club",
                [1]: "built:city-shed:1",
                [2]: "reset:bioseed"
            });
            expect(history.milestoneIDs).toEqual({
                "tech:club": 0,
                "built:city-shed:1": 1,
                "reset:bioseed": 2
            });

            expect(history.runs.length).toBe(1);
            expect(history.runs[0]).toEqual(<HistoryEntry> {
                run: 123,
                universe: "standard",
                milestones: [
                    [0, 10],
                    [1, 20],
                    [2, 456]
                ]
            });
        });

        it("should not affect existing runs", () => {
            const game = new Game(makeGameState({ bioseed: 1 }));
            const history = new HistoryManager(game, {
                milestones: {
                    "tech:club": 0,
                    "reset:mad": 1
                },
                runs: [
                    {
                        run: 122,
                        universe: "standard",
                        milestones: [
                            [0, 10],
                            [1, 20]
                        ]
                    }
                ]
            });

            history.commitRun({ run: 123, universe: "standard", resets: {}, totalDays: 456, milestones: { "tech:club": 10, "built:city-shed:1": 20 } });

            expect(history.milestones).toEqual({
                [0]: "tech:club",
                [1]: "reset:mad",
                [2]: "built:city-shed:1",
                [3]: "reset:bioseed"
            });
            expect(history.milestoneIDs).toEqual({
                "tech:club": 0,
                "reset:mad": 1,
                "built:city-shed:1": 2,
                "reset:bioseed": 3
            });

            expect(history.runs.length).toBe(2);
            expect(history.runs[1]).toEqual(<HistoryEntry> {
                run: 123,
                universe: "standard",
                milestones: [
                    [0, 10],
                    [2, 20],
                    [3, 456]
                ]
            });
        });
    });
});
