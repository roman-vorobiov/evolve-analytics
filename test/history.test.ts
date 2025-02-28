import { describe, expect, it, beforeEach } from "@jest/globals";
import { makeGameState, makeConfig, makeHistory } from "./fixture";

import { Game } from "../src/game";
import { HistoryManager, blankHistory } from "../src/history";
import { ConfigManager } from "../src/config";
import type { LatestRun } from "../src/runTracking";
import type { HistoryEntry } from "../src/history";

describe("History", () => {
    describe("New entry", () => {
        it("should add the reset point as a milestone", () => {
            const game = new Game(makeGameState({ global: { stats: { bioseed: 1 } } }));
            const history = makeHistory({ game }, blankHistory());

            history.commitRun({
                run: 123,
                universe: "standard",
                resets: {},
                totalDays: 456,
                milestones: {},
                activeEffects: {},
                effectsHistory: []
            });

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

        it("should add the star level", () => {
            const game = new Game(makeGameState({ global: { stats: { bioseed: 1 } } }));
            const history = makeHistory({ game }, blankHistory());

            history.commitRun({
                run: 123,
                universe: "standard",
                starLevel: 3,
                resets: {},
                totalDays: 456,
                milestones: {},
                activeEffects: {},
                effectsHistory: []
            });

            expect(history.runs.length).toBe(1);
            expect(history.runs[0]).toEqual(<HistoryEntry> {
                run: 123,
                universe: "standard",
                starLevel: 3,
                milestones: [
                    [0, 456]
                ]
            });
        });

        it("should reuse existing milestone IDs", () => {
            const game = new Game(makeGameState({ global: { stats: { bioseed: 1 } } }));
            const history = makeHistory({ game }, {
                milestones: {
                    "reset:bioseed": 789
                },
                runs: []
            });

            history.commitRun({
                run: 123,
                universe: "standard",
                resets: {},
                totalDays: 456,
                milestones: {},
                activeEffects: {},
                effectsHistory: []
            });

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
            const game = new Game(makeGameState({ global: { stats: { bioseed: 1 } } }));
            const history = makeHistory({ game }, {
                milestones: {
                    "tech:club": 0
                },
                runs: []
            });

            history.commitRun({
                run: 123,
                universe: "standard",
                resets: {},
                totalDays: 456,
                milestones: { "tech:club": 10, "built:city-shed:1": 20 },
                activeEffects: {},
                effectsHistory: []
            });

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

        it("should add all effects", () => {
            const game = new Game(makeGameState({ global: { stats: { bioseed: 1 } } }));
            const history = makeHistory({ game }, {
                milestones: {},
                runs: []
            });

            history.commitRun({
                run: 123,
                universe: "standard",
                resets: {},
                totalDays: 456,
                milestones: {},
                activeEffects: { "effect:hot": 200 },
                effectsHistory: [["effect:hot", 50, 100]]
            });

            expect(history.milestones).toEqual({
                [0]: "reset:bioseed",
                [1]: "effect:hot",
            });
            expect(history.milestoneIDs).toEqual({
                "reset:bioseed": 0,
                "effect:hot": 1
            });

            expect(history.runs.length).toBe(1);
            expect(history.runs[0]).toEqual(<HistoryEntry> {
                run: 123,
                universe: "standard",
                milestones: [
                    [0, 456]
                ],
                effects: [
                    [1, 50, 100],
                    [1, 200, 456]
                ]
            });
        });

        describe("Additional info", () => {
            let game: Game;
            let config: ConfigManager;
            let history: HistoryManager;
            let run: LatestRun;

            beforeEach(() => {
                game = new Game(makeGameState({ global: { stats: { bioseed: 1 } } }));

                config = makeConfig({ game }, {});

                history = new HistoryManager(game, config, blankHistory());

                run = {
                    run: 123,
                    universe: "magic",
                    raceName: "Hello",
                    resets: {},
                    totalDays: 456,
                    milestones: {},
                    activeEffects: {},
                    effectsHistory: []
                };
            });

            it("should not add info if no matching views request it", () => {
                const view = config.addView();
                view.toggleAdditionalInfo("raceName");

                history.commitRun(run);
                expect(history.runs[0].raceName).toBeUndefined();
            });

            it("should add info if a matching view requests it", () => {
                const view = config.addView();
                view.universe = "magic";
                view.resetType = "bioseed";
                view.toggleAdditionalInfo("raceName");

                history.commitRun(run);
                expect(history.runs[0].raceName).toBe("Hello");
            });
        });

        it("should not affect existing runs", () => {
            const game = new Game(makeGameState({ global: { stats: { bioseed: 1 } } }));
            const history = makeHistory({ game }, {
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

            history.commitRun({
                run: 123,
                universe: "standard",
                resets: {},
                totalDays: 456,
                milestones: { "tech:club": 10, "built:city-shed:1": 20 },
                activeEffects: {},
                effectsHistory: []
            });

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
