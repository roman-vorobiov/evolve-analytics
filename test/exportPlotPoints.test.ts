import { describe, expect, it } from "@jest/globals";
import { makeGameState } from "./fixture";

import { Game } from "../src/game";
import { HistoryManager } from "../src/history";
import { asPlotPoints, type PlotPoint } from "../src/exports/plotPoints";
import type { ViewConfig } from "../src/config";
import type { Milestone } from "../src/milestones";

function makeMilestone({ type, name, enabled }: { name: string, type?: Milestone[0], enabled?: boolean }): Milestone {
    type ??= "Built";
    enabled ??= true;

    if (type === "Built") {
        return [type, "", "", name, 1, enabled];
    }
    else if (type === "Researched") {
        return [type, "", name, enabled];
    }
    else {
        return [type, name, enabled];
    }
}

function makeView(fields: Partial<ViewConfig>): ViewConfig {
    return {
        mode: "Total",
        resetType: "MAD",
        milestones: [],
        ...fields
    };
}

describe("Export", () => {
    describe("Plot points", () => {
        it("should calculate the difference between the milestones of a run", () => {
            const game = new Game(makeGameState({}));
            const history = new HistoryManager(game, {
                milestones: { "Foo": 0, "MAD": 1 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 12], [1, 34]] },
                    { run: 456, universe: "standard", milestones: [[0, 56], [1, 80]] }
                ]
            });

            const view = makeView({
                milestones: [
                    makeMilestone({ name: "Foo" }),
                    makeMilestone({ name: "MAD", type: "Reset" })
                ]
            });

            expect(asPlotPoints(history.runs, history, view)).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Foo", day: 12, dayDiff: 12, segment: 12 },
                { run: 0, milestone: "MAD", day: 34, dayDiff: 22, segment: 22 },
                { run: 1, milestone: "Foo", day: 56, dayDiff: 56, segment: 56 },
                { run: 1, milestone: "MAD", day: 80, dayDiff: 24, segment: 24 }
            ]);
        });

        it("should skip disabled milestones", () => {
            const game = new Game(makeGameState({}));
            const history = new HistoryManager(game, {
                milestones: { "Foo": 0, "Bar": 1, "MAD": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            const view = makeView({
                milestones: [
                    makeMilestone({ name: "Foo" }),
                    makeMilestone({ name: "Bar", enabled: false }),
                    makeMilestone({ name: "MAD", type: "Reset" })
                ]
            });

            expect(asPlotPoints(history.runs, history, view)).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Foo", day: 123, dayDiff: 123, segment: 123 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 666, segment: 333 }
            ]);
        });

        it("should skip disabled event milestones", () => {
            const game = new Game(makeGameState({}));
            const history = new HistoryManager(game, {
                milestones: { "Foo": 0, "Bar": 1, "MAD": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            const view = makeView({
                milestones: [
                    makeMilestone({ name: "Foo" }),
                    makeMilestone({ name: "Bar", type: "Event", enabled: false }),
                    makeMilestone({ name: "MAD", type: "Reset" })
                ]
            });

            expect(asPlotPoints(history.runs, history, view)).toStrictEqual(<PlotPoint[]> [
                { run: 0, milestone: "Foo", day: 123, dayDiff: 123, segment: 123 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 666, segment: 666 }
            ]);
        });

        it("should skip filtered milestones", () => {
            const game = new Game(makeGameState({}));
            const history = new HistoryManager(game, {
                milestones: { "Foo": 0, "Bar": 1, "MAD": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            const view = makeView({
                milestones: [
                    makeMilestone({ name: "Foo" }),
                    makeMilestone({ name: "MAD", type: "Reset" })
                ]
            });

            expect(asPlotPoints(history.runs, history, view)).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Foo", day: 123, dayDiff: 123, segment: 123 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 666, segment: 666 }
            ]);
        });

        it("should not calculate dayDiff for event milestones", () => {
            const game = new Game(makeGameState({}));
            const history = new HistoryManager(game, {
                milestones: { "Foo": 0, "Bar": 1, "MAD": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            const view = makeView({
                milestones: [
                    makeMilestone({ name: "Bar", type: "Event" }),
                    makeMilestone({ name: "MAD", type: "Reset" })
                ]
            });

            expect(asPlotPoints(history.runs, history, view)).toStrictEqual(<PlotPoint[]> [
                { run: 0, milestone: "Bar", day: 456, segment: 456 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 789, segment: 789 }
            ]);
        });

        it("should skip disabled milestones when calculating dayDiff and segment", () => {
            const game = new Game(makeGameState({}));
            const history = new HistoryManager(game, {
                milestones: { "Foo": 0, "Bar": 1, "MAD": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            const view = makeView({
                milestones: [
                    makeMilestone({ name: "Foo" }),
                    makeMilestone({ name: "Bar", enabled: false }),
                    makeMilestone({ name: "MAD", type: "Reset" })
                ]
            });

            expect(asPlotPoints(history.runs, history, view)).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Foo", day: 123, dayDiff: 123, segment: 123 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 666, segment: 333 }
            ]);
        });

        it("should skip filtered milestones when calculating dayDiff and segment", () => {
            const game = new Game(makeGameState({}));
            const history = new HistoryManager(game, {
                milestones: { "Foo": 0, "Bar": 1, "MAD": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            const view = makeView({
                milestones: [
                    makeMilestone({ name: "Foo" }),
                    makeMilestone({ name: "MAD", type: "Reset" })
                ]
            });

            expect(asPlotPoints(history.runs, history, view)).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Foo", day: 123, dayDiff: 123, segment: 123 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 666, segment: 666 }
            ]);
        });

        it("should skip event milestones when calculating dayDiff and segment", () => {
            const game = new Game(makeGameState({}));
            const history = new HistoryManager(game, {
                milestones: { "Foo": 0, "Bar": 1, "MAD": 2 },
                runs: [
                    { run: 123, universe: "standard", milestones: [[0, 123], [1, 456], [2, 789]] }
                ]
            });

            const view = makeView({
                milestones: [
                    makeMilestone({ name: "Foo" }),
                    makeMilestone({ name: "Bar", type: "Event" }),
                    makeMilestone({ name: "MAD", type: "Reset" })
                ]
            });

            expect(asPlotPoints(history.runs, history, view)).toEqual(<PlotPoint[]> [
                { run: 0, milestone: "Bar", day: 456, segment: 456 },
                { run: 0, milestone: "Foo", day: 123, dayDiff: 123, segment: 123 },
                { run: 0, milestone: "MAD", day: 789, dayDiff: 666, segment: 666 }
            ]);
        });
    });
});
