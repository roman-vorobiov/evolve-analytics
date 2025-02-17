import { describe, expect, it } from "@jest/globals";
import { makeGameState } from "./fixture";

import { asPlotPoints, runAsPlotPoints, type PlotPoint } from "../src/exports/plotPoints";
import { Game } from "../src/game";
import { HistoryManager } from "../src/history";
import { ConfigManager, type ViewConfig } from "../src/config";
import type { LatestRun } from "../src/runTracking";
import type { universes } from "../src/enums";

function makeView(fields: Partial<ViewConfig>): ViewConfig {
    return {
        mode: "timestamp",
        showBars: false,
        showLines: true,
        fillArea: false,
        smoothness: 0,
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

function makeCurrentRun(totalDays: number, milestones: LatestRun["milestones"]): LatestRun {
    return {
        run: 1,
        universe: "standard",
        resets: {},
        totalDays,
        milestones,
        activeEffects: {},
        effectsHistory: [],
    };
}

describe("Export", () => {
    describe("Plot points", () => {
        it("should calculate the difference between the milestones of a run", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "tech:club": { index: 0, enabled: true, color: "#4269d0" },
                    "reset:mad": { index: 1, enabled: true, color: "#efb118" }
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: { "tech:club": 0, "reset:mad": 1 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 12], [1, 34]] },
                    { run: 456, universe: "standard", milestones: [[0, 56], [1, 80]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0], game)).toEqual(<PlotPoint[]> [
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
                    "tech:club": { index: 0, enabled: true, color: "#4269d0" },
                    "tech:wheel": { index: 1, enabled: false, color: "#efb118" },
                    "reset:mad": { index: 2, enabled: true, color: "#ff725c" }
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: { "tech:club": 0, "tech:wheel": 1, "reset:mad": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0], game)).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Club", day: 123, dayDiff: 123, segment: 123 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 666, segment: 333 }
            ]);
        });

        it("should skip disabled event milestones", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "tech:club": { index: 0, enabled: true, color: "#4269d0" },
                    "event:womlings": { index: 1, enabled: false, color: "#efb118" },
                    "reset:mad": { index: 2, enabled: true, color: "#ff725c" }
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: { "tech:club": 0, "event:womlings": 1, "reset:mad": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0], game)).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Club", day: 123, dayDiff: 123, segment: 123 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 666, segment: 666 }
            ]);
        });

        it("should skip filtered milestones", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "tech:club": { index: 0, enabled: true, color: "#4269d0" },
                    "reset:mad": { index: 1, enabled: true, color: "#efb118" }
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: { "tech:club": 0, "tech:wheel": 1, "reset:mad": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0], game)).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Club", day: 123, dayDiff: 123, segment: 123 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 666, segment: 666 }
            ]);
        });

        it("should calculate event segments", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "event:elerium": { index: 0, enabled: true, color: "#4269d0" },
                    "event:alien": { index: 1, enabled: true, color: "#efb118" },
                    "reset:mad": { index: 2, enabled: true, color: "#ff725c" }
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: {
                    "event:elerium": 0,
                    "event_condition:elerium": 1,
                    "event:alien": 2,
                    "event_condition:alien": 3,
                    "reset:mad": 4
                },
                runs: [
                    { run: 123, universe: "standard", milestones: [[1, 100], [0, 123], [3, 400], [2, 456], [4, 789]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0], game)).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "MAD", day: 789, dayDiff: 789, segment: 789 },
                { run: 0, milestone: "Elerium discovery", day: 123, segment: 23, event: true },
                { run: 0, milestone: "Alien encounter", day: 456, segment: 56, event: true }
            ]);
        });

        it("should calculate event segments (unknown)", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "event:elerium": { index: 0, enabled: true, color: "#4269d0" },
                    "event:womlings": { index: 1, enabled: true, color: "#efb118" },
                    "reset:mad": { index: 2, enabled: true, color: "#ff725c" }
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: {
                    "event:elerium": 0,
                    "event:womlings": 1,
                    "reset:mad": 2
                },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0], game)).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "MAD", day: 789, dayDiff: 789, segment: 789 },
                { run: 0, milestone: "Elerium discovery", day: 123, segment: 0, event: true },
                { run: 0, milestone: "Womlings arrival", day: 456, segment: 456, event: true }
            ]);
        });

        it("should skip disabled milestones when calculating dayDiff and segment", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "tech:club": { index: 0, enabled: true, color: "#4269d0" },
                    "tech:wheel": { index: 1, enabled: false, color: "#efb118" },
                    "reset:mad": { index: 2, enabled: true, color: "#ff725c" }
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: { "tech:club": 0, "tech:wheel": 1, "reset:mad": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0], game)).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Club", day: 123, dayDiff: 123, segment: 123 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 666, segment: 333 }
            ]);
        });

        it("should skip filtered milestones when calculating dayDiff and segment", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "tech:club": { index: 0, enabled: true, color: "#4269d0" },
                    "reset:mad": { index: 1, enabled: true, color: "#efb118" }
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: { "tech:club": 0, "tech:wheel": 1, "reset:mad": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0], game)).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Club", day: 123, dayDiff: 123, segment: 123 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 666, segment: 666 }
            ]);
        });

        it("should skip event milestones when calculating dayDiff and segment", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "tech:club": { index: 0, enabled: true, color: "#4269d0" },
                    "event:womlings": { index: 1, enabled: true, color: "#efb118" },
                    "reset:mad": { index: 2, enabled: true, color: "#ff725c" }
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: { "tech:club": 0, "event:womlings": 1, "reset:mad": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0], game)).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Club", day: 123, dayDiff: 123, segment: 123 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 666, segment: 666 },
                { run: 0, milestone: "Womlings arrival", day: 456, segment: 456, event: true }
            ]);
        });

        it("should include additional info", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "tech:club": { index: 0, enabled: true, color: "#4269d0" },
                    "reset:mad": { index: 1, enabled: true, color: "#efb118" }
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: { "tech:club": 0, "reset:mad": 1 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 12], [1, 34]], raceName: "Hello" },
                    { run: 456, universe: "standard", milestones: [[0, 56], [1, 80]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0], game)).toEqual(<PlotPoint[]> [
                { run: 0, raceName: "Hello", milestone: "Club", day: 12, dayDiff: 12, segment: 12 },
                { run: 0, raceName: "Hello", milestone: "MAD", day: 34, dayDiff: 22, segment: 22 },
                { run: 1, milestone: "Club", day: 56, dayDiff: 56, segment: 56 },
                { run: 1, milestone: "MAD", day: 80, dayDiff: 24, segment: 24 }
            ]);
        });

        it("should include enabled effects", () => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                milestones: {
                    "effect:hot": { index: 0, enabled: true, color: "#4269d0" },
                    "effect:cold": { index: 1, enabled: false, color: "#efb118" }
                }
            });

            const history = new HistoryManager(game, config, {
                milestones: { "effect:hot": 0, "effect:cold": 1, "reset:mad": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [], effects: [[0, 12, 23], [1, 34, 45]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0], game)).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Hot days", day: 23, segment: 11, effect: true },
            ]);
        });

        it.each([
            { universe: undefined, resetName: "Black Hole" },
            { universe: "heavy", resetName: "Black Hole" },
            { universe: "magic", resetName: "Vacuum Collapse" }
        ])("should adjust reset names", ({ universe, resetName }) => {
            const game = new Game(makeGameState({}));

            const config = makeConfig(game, {
                universe: universe as keyof typeof universes,
                milestones: {
                    "reset:blackhole": { index: 0, enabled: true, color: "#4269d0" }
                }
            });

            // Note that the name generation looks at the view's universe, not the runs themselves
            const history = new HistoryManager(game, config, {
                milestones: { "reset:blackhole": 0 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 12]] }
                ]
            });

            expect(asPlotPoints(history.runs, history, config.views[0], game)).toEqual(<PlotPoint[]> [
                { run: 0, milestone: resetName, day: 12, dayDiff: 12, segment: 12 },
            ]);
        });

        describe("Current run", () => {
            it("should use reset as the next milestone if the only run (enabled)", () => {
                const game = new Game(makeGameState({}));

                const config = makeConfig(game, {
                    milestones: {
                        "reset:mad": { index: 0, enabled: true, color: "#4269d0" }
                    }
                });

                const currentRun = makeCurrentRun(123, {});

                expect(runAsPlotPoints(currentRun, config.views[0], game, [], false, 456)).toEqual(<PlotPoint[]> [
                    { run: 456, milestone: "MAD", day: 123, dayDiff: 123, segment: 123, pending: true }
                ]);
            });

            it("should use reset as the next milestone if the only run (disabled)", () => {
                const game = new Game(makeGameState({}));

                const config = makeConfig(game, {
                    milestones: {
                        "reset:mad": { index: 0, enabled: false, color: "#4269d0" }
                    }
                });

                const currentRun = makeCurrentRun(123, {});

                expect(runAsPlotPoints(currentRun, config.views[0], game, [], false, 456)).toEqual([]);
            });

            it("should include all enabled milestones", () => {
                const game = new Game(makeGameState({}));

                const config = makeConfig(game, {
                    milestones: {
                        "tech:club": { index: 0, enabled: true, color: "#4269d0" },
                        "tech:wheel": { index: 1, enabled: false, color: "#efb118" },
                        "reset:mad": { index: 2, enabled: true, color: "#ff725c" }
                    }
                });

                const currentRun = makeCurrentRun(123, {
                    "tech:club": 10,
                    "tech:wheel": 20
                });

                expect(runAsPlotPoints(currentRun, config.views[0], game, [], false, 456)).toEqual(<PlotPoint[]> [
                    { run: 456, milestone: "Club", day: 10, dayDiff: 10, segment: 10 },
                    { run: 456, milestone: "MAD", day: 123, dayDiff: 113, segment: 103, pending: true }
                ]);
            });

            it("should include all enabled active effects", () => {
                const game = new Game(makeGameState({}));

                const config = makeConfig(game, {
                    milestones: {
                        "effect:hot": { index: 0, enabled: true, color: "#4269d0" },
                        "effect:cold": { index: 1, enabled: false, color: "#efb118" },
                        "reset:mad": { index: 2, enabled: true, color: "#ff725c" }
                    }
                });

                const currentRun = makeCurrentRun(123, {});
                currentRun.activeEffects = {
                    "effect:hot": 10,
                    "effect:cold": 20
                };

                expect(runAsPlotPoints(currentRun, config.views[0], game, [], false, 456)).toEqual(<PlotPoint[]> [
                    { run: 456, milestone: "MAD", day: 123, dayDiff: 123, segment: 123, pending: true },
                    { run: 456, milestone: "Hot days", day: 123, segment: 113, effect: true, pending: true }
                ]);
            });

            it("should include all enabled past effects", () => {
                const game = new Game(makeGameState({}));

                const config = makeConfig(game, {
                    milestones: {
                        "effect:hot": { index: 0, enabled: true, color: "#4269d0" },
                        "effect:cold": { index: 1, enabled: false, color: "#efb118" },
                        "reset:mad": { index: 2, enabled: true, color: "#ff725c" }
                    }
                });

                const currentRun = makeCurrentRun(123, {});
                currentRun.effectsHistory = [
                    ["effect:hot", 2, 4],
                    ["effect:cold", 3, 5],
                ];

                expect(runAsPlotPoints(currentRun, config.views[0], game, [], false, 456)).toEqual(<PlotPoint[]> [
                    { run: 456, milestone: "MAD", day: 123, dayDiff: 123, segment: 123, pending: true },
                    { run: 456, milestone: "Hot days", day: 4, segment: 2, effect: true }
                ]);
            });

            it.each([5, 10, 15])("should use the next milestone from PB as the current one", (day) => {
                const game = new Game(makeGameState({}));

                const config = makeConfig(game, {
                    milestones: {
                        "tech:club": { index: 0, enabled: true, color: "#4269d0" },
                        "tech:wheel": { index: 1, enabled: true, color: "#efb118" },
                        "reset:mad": { index: 2, enabled: true, color: "#ff725c" }
                    }
                });

                const currentRun = makeCurrentRun(day, {});

                const bestRun: PlotPoint[] = [
                    { run: 1, milestone: "Club", day: 10, dayDiff: 10, segment: 10 },
                    { run: 1, milestone: "Wheel", day: 20, dayDiff: 10, segment: 10 },
                    { run: 1, milestone: "MAD", day: 30, dayDiff: 10, segment: 10 }
                ];

                expect(runAsPlotPoints(currentRun, config.views[0], game, bestRun, false, 456)).toEqual(<PlotPoint[]> [
                    { run: 456, milestone: "Club", day, dayDiff: day, segment: day, pending: true }
                ]);
            });

            it("should skip event milestones", () => {
                const game = new Game(makeGameState({}));

                const config = makeConfig(game, {
                    milestones: {
                        "event:womlings": { index: 0, enabled: true, color: "#4269d0" },
                        "tech:wheel": { index: 1, enabled: true, color: "#efb118" },
                        "reset:mad": { index: 2, enabled: true, color: "#ff725c" }
                    }
                });

                const currentRun = makeCurrentRun(15, {});

                const bestRun: PlotPoint[] = [
                    { run: 1, milestone: "Womlings arrival", day: 10, segment: 10, event: true },
                    { run: 1, milestone: "Wheel", day: 20, dayDiff: 20, segment: 20 },
                    { run: 1, milestone: "MAD", day: 30, dayDiff: 10, segment: 10 }
                ];

                expect(runAsPlotPoints(currentRun, config.views[0], game, bestRun, false, 456)).toEqual(<PlotPoint[]> [
                    { run: 456, milestone: "Wheel", day: 15, dayDiff: 15, segment: 15, pending: true }
                ]);
            });

            it("should skip effect milestones", () => {
                const game = new Game(makeGameState({}));

                const config = makeConfig(game, {
                    milestones: {
                        "effect:hot": { index: 0, enabled: true, color: "#4269d0" },
                        "tech:wheel": { index: 1, enabled: true, color: "#efb118" },
                        "reset:mad": { index: 2, enabled: true, color: "#ff725c" }
                    }
                });

                const currentRun = makeCurrentRun(15, {});

                const bestRun: PlotPoint[] = [
                    { run: 1, milestone: "Hot days", day: 10, segment: 10, effect: true },
                    { run: 1, milestone: "Wheel", day: 20, dayDiff: 20, segment: 20 },
                    { run: 1, milestone: "MAD", day: 30, dayDiff: 10, segment: 10 }
                ];

                expect(runAsPlotPoints(currentRun, config.views[0], game, bestRun, false, 456)).toEqual(<PlotPoint[]> [
                    { run: 456, milestone: "Wheel", day: 15, dayDiff: 15, segment: 15, pending: true }
                ]);
            });

            it("should skip reached milestones", () => {
                const game = new Game(makeGameState({}));

                const config = makeConfig(game, {
                    milestones: {
                        "tech:club": { index: 0, enabled: true, color: "#4269d0" },
                        "tech:wheel": { index: 1, enabled: true, color: "#efb118" },
                        "tech:housing": { index: 2, enabled: true, color: "#ff725c" },
                        "tech:cottage": { index: 3, enabled: true, color: "#6cc5b0" },
                        "reset:mad": { index: 4, enabled: true, color: "#3ca951" }
                    }
                });

                const currentRun = makeCurrentRun(35, {
                    "tech:club": 10,
                    "tech:housing": 30,
                });

                const bestRun: PlotPoint[] = [
                    { run: 1, milestone: "Club", day: 10, dayDiff: 10, segment: 10 },
                    { run: 1, milestone: "Wheel", day: 20, dayDiff: 10, segment: 10 },
                    { run: 1, milestone: "Housing", day: 30, dayDiff: 10, segment: 10 },
                    { run: 1, milestone: "Cottage", day: 40, dayDiff: 10, segment: 10 },
                    { run: 1, milestone: "MAD", day: 50, dayDiff: 10, segment: 10 }
                ];

                expect(runAsPlotPoints(currentRun, config.views[0], game, bestRun, false, 456)).toEqual(<PlotPoint[]> [
                    { run: 456, milestone: "Club", day: 10, dayDiff: 10, segment: 10 },
                    { run: 456, milestone: "Housing", day: 30, dayDiff: 20, segment: 20 },
                    { run: 456, milestone: "Cottage", day: 35, dayDiff: 5, segment: 5, pending: true },
                ]);
            });

            it("should yield pending events", () => {
                const game = new Game(makeGameState({}));

                const config = makeConfig(game, {
                    milestones: {
                        "event:elerium": { index: 0, enabled: true, color: "#4269d0" },
                        "reset:mad": { index: 1, enabled: true, color: "#efb118" }
                    }
                });

                const currentRun = makeCurrentRun(15, {
                    "event_condition:elerium": 10
                });

                const bestRun: PlotPoint[] = [
                    { run: 1, milestone: "MAD", day: 30, dayDiff: 30, segment: 30 }
                ];

                expect(runAsPlotPoints(currentRun, config.views[0], game, bestRun, false, 456)).toEqual(<PlotPoint[]> [
                    { run: 456, milestone: "MAD", day: 15, dayDiff: 15, segment: 15, pending: true },
                    { run: 456, milestone: "Elerium discovery", day: 15, segment: 5, pending: true, event: true },
                ]);
            });

            describe("Future segments", () => {
                it("should use PB milestones as reference", () => {
                    const game = new Game(makeGameState({}));

                    const config = makeConfig(game, {
                        milestones: {
                            "tech:club": { index: 0, enabled: true, color: "#4269d0" },
                            "tech:wheel": { index: 1, enabled: true, color: "#efb118" },
                            "reset:mad": { index: 2, enabled: true, color: "#ff725c" }
                        }
                    });

                    const currentRun = makeCurrentRun(5, {});

                    const bestRun: PlotPoint[] = [
                        { run: 1, milestone: "Club", day: 10, dayDiff: 10, segment: 10 },
                        { run: 1, milestone: "Wheel", day: 20, dayDiff: 10, segment: 10 },
                        { run: 1, milestone: "MAD", day: 30, dayDiff: 10, segment: 10 }
                    ];

                    expect(runAsPlotPoints(currentRun, config.views[0], game, bestRun, true, 456)).toEqual(<PlotPoint[]> [
                        { run: 456, milestone: "Club", day: 5, dayDiff: 5, segment: 5, pending: true },
                        { run: 456, milestone: "Club", day: 10, dayDiff: 5, segment: 5, future: true },
                        { run: 456, milestone: "Wheel", day: 20, dayDiff: 10, segment: 10, future: true },
                        { run: 456, milestone: "MAD", day: 30, dayDiff: 10, segment: 10, future: true }
                    ]);
                });

                it("should skip reached milestones", () => {
                    const game = new Game(makeGameState({}));

                    const config = makeConfig(game, {
                        milestones: {
                            "tech:club": { index: 0, enabled: true, color: "#4269d0" },
                            "tech:wheel": { index: 1, enabled: true, color: "#efb118" },
                            "tech:housing": { index: 2, enabled: true, color: "#ff725c" },
                            "tech:cottage": { index: 3, enabled: true, color: "#6cc5b0" },
                            "reset:mad": { index: 4, enabled: true, color: "#3ca951" }
                        }
                    });

                    const currentRun = makeCurrentRun(35, {
                        "tech:club": 10,
                        "tech:housing": 30,
                    });

                    const bestRun: PlotPoint[] = [
                        { run: 1, milestone: "Club", day: 10, dayDiff: 10, segment: 10 },
                        { run: 1, milestone: "Wheel", day: 20, dayDiff: 10, segment: 10 },
                        { run: 1, milestone: "Housing", day: 30, dayDiff: 10, segment: 10 },
                        { run: 1, milestone: "Cottage", day: 40, dayDiff: 10, segment: 10 },
                        { run: 1, milestone: "MAD", day: 50, dayDiff: 10, segment: 10 }
                    ];

                    expect(runAsPlotPoints(currentRun, config.views[0], game, bestRun, true, 456)).toEqual(<PlotPoint[]> [
                        { run: 456, milestone: "Club", day: 10, dayDiff: 10, segment: 10 },
                        { run: 456, milestone: "Housing", day: 30, dayDiff: 20, segment: 20 },
                        { run: 456, milestone: "Cottage", day: 35, dayDiff: 5, segment: 5, pending: true },
                        { run: 456, milestone: "Cottage", day: 40, dayDiff: 5, segment: 5, future: true },
                        { run: 456, milestone: "MAD", day: 50, dayDiff: 10, segment: 10, future: true },
                    ]);
                });

                it.each([30, 35])("should squish the pending future milestone", (day) => {
                    const game = new Game(makeGameState({}));

                    const config = makeConfig(game, {
                        milestones: {
                            "tech:club": { index: 0, enabled: true, color: "#4269d0" },
                            "tech:housing": { index: 1, enabled: true, color: "#efb118" },
                            "tech:cottage": { index: 2, enabled: true, color: "#ff725c" },
                            "reset:mad": { index: 3, enabled: true, color: "#6cc5b0" }
                        }
                    });

                    const currentRun = makeCurrentRun(day, {
                        "tech:club": 10,
                        "tech:housing": 20,
                    });

                    const bestRun: PlotPoint[] = [
                        { run: 1, milestone: "Club", day: 10, dayDiff: 10, segment: 10 },
                        { run: 1, milestone: "Housing", day: 20, dayDiff: 10, segment: 10 },
                        { run: 1, milestone: "Cottage", day: 30, dayDiff: 10, segment: 10 },
                        { run: 1, milestone: "MAD", day: 40, dayDiff: 10, segment: 10 }
                    ];

                    const offset = day - bestRun[2].day;

                    expect(runAsPlotPoints(currentRun, config.views[0], game, bestRun, true, 456)).toEqual(<PlotPoint[]> [
                        { run: 456, milestone: "Club", day: 10, dayDiff: 10, segment: 10 },
                        { run: 456, milestone: "Housing", day: 20, dayDiff: 10, segment: 10 },
                        { run: 456, milestone: "Cottage", day: day, dayDiff: 10 + offset, segment: 10 + offset, pending: true },
                        { run: 456, milestone: "Cottage", day: day, dayDiff: 0, segment: 0, future: true },
                        { run: 456, milestone: "MAD", day: 40 + offset, dayDiff: 10, segment: 10, future: true },
                    ]);
                });

                it.each([15, 25])("should adjust future milestones based on the last segment difference", (day) => {
                    const game = new Game(makeGameState({}));

                    const config = makeConfig(game, {
                        milestones: {
                            "tech:club": { index: 0, enabled: true, color: "#4269d0" },
                            "tech:housing": { index: 1, enabled: true, color: "#efb118" },
                            "tech:cottage": { index: 2, enabled: true, color: "#ff725c" },
                            "reset:mad": { index: 3, enabled: true, color: "#6cc5b0" }
                        }
                    });

                    const currentRun = makeCurrentRun(30, {
                        "tech:club": 10,
                        "tech:housing": day
                    });

                    const bestRun: PlotPoint[] = [
                        { run: 1, milestone: "Club", day: 10, dayDiff: 10, segment: 10 },
                        { run: 1, milestone: "Housing", day: 20, dayDiff: 10, segment: 10 },
                        { run: 1, milestone: "Cottage", day: 40, dayDiff: 20, segment: 20 },
                        { run: 1, milestone: "MAD", day: 50, dayDiff: 10, segment: 10 }
                    ];

                    const offset = day - bestRun[1].day;

                    expect(runAsPlotPoints(currentRun, config.views[0], game, bestRun, true, 456)).toEqual(<PlotPoint[]> [
                        { run: 456, milestone: "Club", day: 10, dayDiff: 10, segment: 10 },
                        { run: 456, milestone: "Housing", day, dayDiff: 10 + offset, segment: 10 + offset },
                        { run: 456, milestone: "Cottage", day: 30, dayDiff: 10 - offset, segment: 10 - offset, pending: true },
                        { run: 456, milestone: "Cottage", day: 40 + offset, dayDiff: 10 + offset, segment: 10 + offset, future: true },
                        { run: 456, milestone: "MAD", day: 50 + offset, dayDiff: 10, segment: 10, future: true },
                    ]);
                });

                it.each([15, 25])("should ignore events when calculating the difference", (day) => {
                    const game = new Game(makeGameState({}));

                    const config = makeConfig(game, {
                        milestones: {
                            "event:womlings": { index: 0, enabled: true, color: "#4269d0" },
                            "tech:club": { index: 1, enabled: true, color: "#efb118" },
                            "tech:housing": { index: 2, enabled: true, color: "#ff725c" },
                            "reset:mad": { index: 3, enabled: true, color: "#6cc5b0" }
                        }
                    });

                    const currentRun = makeCurrentRun(30, {
                        "tech:club": 15,
                        "event:womlings": day,
                    });

                    const bestRun: PlotPoint[] = [
                        { run: 1, milestone: "Club", day: 10, dayDiff: 10, segment: 10 },
                        { run: 1, milestone: "Womlings arrival", day: 20, segment: 20, event: true },
                        { run: 1, milestone: "Housing", day: 30, dayDiff: 20, segment: 20 },
                        { run: 1, milestone: "MAD", day: 40, dayDiff: 10, segment: 10 }
                    ];

                    expect(runAsPlotPoints(currentRun, config.views[0], game, bestRun, true, 456)).toEqual(<PlotPoint[]> [
                        { run: 456, milestone: "Club", day: 15, dayDiff: 15, segment: 15 },
                        { run: 456, milestone: "Womlings arrival", day, segment: day, event: true },
                        { run: 456, milestone: "Housing", day: 30, dayDiff: 15, segment: 15, pending: true },
                        { run: 456, milestone: "Housing", day: 35, dayDiff: 5, segment: 5, future: true },
                        { run: 456, milestone: "MAD", day: 45, dayDiff: 10, segment: 10, future: true },
                    ]);
                });
            });
        });
    });
});
