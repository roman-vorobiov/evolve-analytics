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

            expect(history.milestones).toEqual({ [0]: "Bioseed" });
            expect(history.milestoneIDs).toEqual({ "Bioseed": 0 });

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
                    "Bioseed": 789
                },
                runs: []
            });

            history.commitRun({ run: 123, universe: "standard", resets: {}, totalDays: 456, milestones: {} });

            expect(history.milestones).toEqual({ [789]: "Bioseed" });
            expect(history.milestoneIDs).toEqual({ "Bioseed": 789 });

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
                    "foo": 0
                },
                runs: []
            });

            history.commitRun({ run: 123, universe: "standard", resets: {}, totalDays: 456, milestones: { "foo": 10, "bar": 20 } });

            expect(history.milestones).toEqual({
                [0]: "foo",
                [1]: "bar",
                [2]: "Bioseed"
            });
            expect(history.milestoneIDs).toEqual({
                "foo": 0,
                "bar": 1,
                "Bioseed": 2
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
                    "foo": 0,
                    "MAD": 1
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

            history.commitRun({ run: 123, universe: "standard", resets: {}, totalDays: 456, milestones: { "foo": 10, "bar": 20 } });

            expect(history.milestones).toEqual({
                [0]: "foo",
                [1]: "MAD",
                [2]: "bar",
                [3]: "Bioseed"
            });
            expect(history.milestoneIDs).toEqual({
                "foo": 0,
                "MAD": 1,
                "bar": 2,
                "Bioseed": 3
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
