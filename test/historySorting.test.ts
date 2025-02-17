import { describe, expect, it } from "@jest/globals";
import { makeGameState } from "./fixture";

import { sortMilestones } from "../src/exports/utils";
import { Game } from "../src/game";
import { HistoryManager } from "../src/history";
import { ConfigManager, type ViewConfig } from "../src/config";

function makeView(milestones: string[]): ViewConfig {
    return {
        mode: "timestamp",
        showBars: false,
        showLines: true,
        fillArea: true,
        smoothness: 0,
        resetType: "blackhole",
        universe: "standard",
        milestones: Object.fromEntries(milestones.map((m, index) => [m, { index, enabled: true, color: "" }])),
        additionalInfo: []
    };
}

function makeConfig(game: Game, view: ViewConfig) {
    return new ConfigManager(game, {
        version: 14,
        recordRuns: true,
        views: [view]
    });
}

function getMilestones(view: ViewConfig) {
    return Object.keys(view.milestones).sort((l, r) => view.milestones[l].index - view.milestones[r].index);
}

describe("Export", () => {
    describe("Sorting", () => {
        it("should not sort with an empty history", () => {
            const view = makeView([
                "tech:club",
                "tech:wheel"
            ]);

            const game = new Game(makeGameState({}));
            const config = makeConfig(game, view);
            const history = new HistoryManager(game, config, {
                milestones: {},
                runs: []
            });

            sortMilestones(view, history);

            expect(getMilestones(view)).toEqual([
                "tech:club",
                "tech:wheel"
            ]);
        });

        it("should sort based on the order in the last run", () => {
            const view = makeView([
                "tech:club",
                "tech:wheel",
                "reset:blackhole"
            ]);

            const game = new Game(makeGameState({}));
            const config = makeConfig(game, view);
            const history = new HistoryManager(game, config, {
                milestones: {
                    "reset:blackhole": 0,
                    "tech:wheel": 1,
                    "tech:club": 2
                },
                runs: [
                    {
                        run: 1,
                        universe: "standard",
                        milestones: [[1, 10], [2, 20], [0, 30]]
                    },
                    {
                        run: 2,
                        universe: "standard",
                        milestones: [[2, 10], [1, 20], [0, 30]]
                    }
                ]
            });

            sortMilestones(view, history);

            expect(getMilestones(view)).toEqual([
                "reset:blackhole",
                "tech:wheel",
                "tech:club"
            ]);
        });

        it("should ignore filtered runs", () => {
            const view = makeView([
                "tech:club",
                "tech:wheel",
                "reset:blackhole"
            ]);

            const game = new Game(makeGameState({}));
            const config = makeConfig(game, view);
            const history = new HistoryManager(game, config, {
                milestones: {
                    "reset:blackhole": 0,
                    "tech:wheel": 1,
                    "tech:club": 2
                },
                runs: [
                    {
                        run: 1,
                        universe: "standard",
                        milestones: [[1, 10], [2, 20], [0, 30]]
                    },
                    {
                        run: 2,
                        universe: "antimatter",
                        milestones: [[1, 10], [2, 20], [0, 30]]
                    }
                ]
            });

            sortMilestones(view, history);

            expect(getMilestones(view)).toEqual([
                "reset:blackhole",
                "tech:club",
                "tech:wheel"
            ]);
        });

        it("should preserve the order of milestones not present in the last run", () => {
            const view = makeView([
                "tech:housing",
                "tech:club",
                "tech:wheel",
                "tech:cottage",
                "reset:blackhole"
            ]);

            const game = new Game(makeGameState({}));
            const config = makeConfig(game, view);
            const history = new HistoryManager(game, config, {
                milestones: {
                    "reset:blackhole": 0,
                    "tech:wheel": 1,
                    "tech:club": 2,
                    "tech:housing": 3,
                    "tech:cottage": 4
                },
                runs: [
                    {
                        run: 1,
                        universe: "standard",
                        milestones: [[1, 10], [2, 20], [3, 30], [4, 40], [0, 50]]
                    },
                    {
                        run: 2,
                        universe: "standard",
                        milestones: [[2, 10], [1, 20], [0, 30]]
                    }
                ]
            });

            sortMilestones(view, history);

            expect(getMilestones(view)).toEqual([
                "reset:blackhole",
                "tech:wheel",
                "tech:club",
                "tech:housing",
                "tech:cottage"
            ]);
        });

        it("should put effect milestones at the end", () => {
            const view = makeView([
                "effect:hot",
                "reset:blackhole",
                "effect:cold",
            ]);

            const game = new Game(makeGameState({}));
            const config = makeConfig(game, view);
            const history = new HistoryManager(game, config, {
                milestones: {
                    "reset:blackhole": 0,
                    "effect:hot": 1,
                    "effect:cold": 2
                },
                runs: [
                    {
                        run: 1,
                        universe: "standard",
                        milestones: [[0, 30]],
                        effects: [[1, 10, 20], [2, 0, 10]],
                    }
                ]
            });

            sortMilestones(view, history);

            expect(getMilestones(view)).toEqual([
                "reset:blackhole",
                "effect:hot",
                "effect:cold"
            ]);
        });
    });
});
