import { describe, expect, it } from "@jest/globals";
import { makeGameState } from "./fixture";

import { Game } from "../src/game";
import { HistoryManager } from "../src/history";
import { asPlotPoints, type PlotPoint } from "../src/exports/plotPoints";
import { ConfigManager, type ViewConfig } from "../src/config";

function makeView(fields: Partial<ViewConfig>): ViewConfig {
    return {
        mode: "total",
        resetType: "mad",
        milestones: {},
        additionalInfo: [],
        ...fields
    };
}

function makeConfig(game: Game, view: Partial<ViewConfig>): ConfigManager {
    return new ConfigManager(game, {
        version: 5,
        recordRuns: true,
        views: [makeView(view)]
    });
}

describe("Export", () => {
    describe("Plot points", () => {
        it("should calculate the difference between the milestones of a run", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "tech:club": true,
                    "reset:mad": true
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: { "tech:club": 0, "reset:mad": 1 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 12], [1, 34]] },
                    { run: 456, universe: "standard", milestones: [[0, 56], [1, 80]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0])).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Club", day: 12, dayDiff: 12, segment: 12 },
                { run: 0, milestone: "MAD", day: 34, dayDiff: 22, segment: 22 },
                { run: 1, milestone: "Club", day: 56, dayDiff: 56, segment: 56 },
                { run: 1, milestone: "MAD", day: 80, dayDiff: 24, segment: 24 }
            ]);
        });

        it("should skip disabled milestones", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "tech:club": true,
                    "tech:wheel": false,
                    "reset:mad": true
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: { "tech:club": 0, "tech:wheel": 1, "reset:mad": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0])).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Club", day: 123, dayDiff: 123, segment: 123 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 666, segment: 333 }
            ]);
        });

        it("should skip disabled event milestones", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "tech:club": true,
                    "event:womlings": false,
                    "reset:mad": true
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: { "tech:club": 0, "event:womlings": 1, "reset:mad": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0])).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Club", day: 123, dayDiff: 123, segment: 123 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 666, segment: 666 }
            ]);
        });

        it("should skip filtered milestones", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "tech:club": true,
                    "reset:mad": true
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: { "tech:club": 0, "tech:wheel": 1, "reset:mad": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0])).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Club", day: 123, dayDiff: 123, segment: 123 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 666, segment: 666 }
            ]);
        });

        it("should not calculate dayDiff for event milestones", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "event:womlings": true,
                    "reset:mad": true
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: { "tech:club": 0, "event:womlings": 1, "reset:mad": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0])).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Womlings arrival", day: 456, segment: 456 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 789, segment: 789 }
            ]);
        });

        it("should skip disabled milestones when calculating dayDiff and segment", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "tech:club": true,
                    "tech:wheel": false,
                    "reset:mad": true
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: { "tech:club": 0, "tech:wheel": 1, "reset:mad": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0])).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Club", day: 123, dayDiff: 123, segment: 123 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 666, segment: 333 }
            ]);
        });

        it("should skip filtered milestones when calculating dayDiff and segment", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "tech:club": true,
                    "reset:mad": true
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: { "tech:club": 0, "tech:wheel": 1, "reset:mad": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0])).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Club", day: 123, dayDiff: 123, segment: 123 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 666, segment: 666 }
            ]);
        });

        it("should skip event milestones when calculating dayDiff and segment", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "tech:club": true,
                    "event:womlings": true,
                    "reset:mad": true
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: { "tech:club": 0, "event:womlings": 1, "reset:mad": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0])).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Womlings arrival", day: 456, segment: 456 },
                { run: 0, milestone: "Club", day: 123, dayDiff: 123, segment: 123 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 666, segment: 666 }
            ]);
        });

        it("should include additional info", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "tech:club": true,
                    "reset:mad": true
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: { "tech:club": 0, "reset:mad": 1 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 12], [1, 34]], raceName: "Hello" },
                    { run: 456, universe: "standard", milestones: [[0, 56], [1, 80]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0])).toEqual(<PlotPoint[]> [
                { run: 0, raceName: "Hello", milestone: "Club", day: 12, dayDiff: 12, segment: 12 },
                { run: 0, raceName: "Hello", milestone: "MAD", day: 34, dayDiff: 22, segment: 22 },
                { run: 1, milestone: "Club", day: 56, dayDiff: 56, segment: 56 },
                { run: 1, milestone: "MAD", day: 80, dayDiff: 24, segment: 24 }
            ]);
        });
    });
});
