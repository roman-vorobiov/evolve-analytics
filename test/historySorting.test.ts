import { describe, expect, it } from "@jest/globals";
import { makeGameState, makeConfig, makeView, makeMilestones, makeHistory } from "./fixture";

import { sortMilestones } from "../src/exports/utils";
import { Game } from "../src/game";
import { blankHistory } from "../src/history";
import type { ViewConfig } from "../src/config";

function getMilestones(view: ViewConfig) {
    return Object.keys(view.milestones).sort((l, r) => view.milestones[l].index - view.milestones[r].index);
}

describe("Export", () => {
    describe("Sorting", () => {
        it("should not sort with an empty history", () => {
            const view = makeView({
                milestones: makeMilestones([
                    "tech:club",
                    "tech:wheel"
                ])
            });

            const game = new Game(makeGameState({}));
            const config = makeConfig({ game }, { views: [view] });
            const history = makeHistory({ game, config }, blankHistory());

            sortMilestones(view, history);

            expect(getMilestones(view)).toEqual([
                "tech:club",
                "tech:wheel"
            ]);
        });

        it("should sort based on the order in the last run", () => {
            const view = makeView({
                milestones: makeMilestones([
                    "tech:club",
                    "tech:wheel",
                    "reset:blackhole"
                ])
            });

            const game = new Game(makeGameState({}));
            const config = makeConfig({ game }, { views: [view] });
            const history = makeHistory({ game, config }, {
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
            const view = makeView({
                milestones: makeMilestones([
                    "tech:club",
                    "tech:wheel",
                    "reset:blackhole"
                ])
            });

            const game = new Game(makeGameState({}));
            const config = makeConfig({ game }, { views: [view] });
            const history = makeHistory({ game, config }, {
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
            const view = makeView({
                milestones: makeMilestones([
                    "tech:housing",
                    "tech:club",
                    "tech:wheel",
                    "tech:cottage",
                    "reset:blackhole"
                ])
            });

            const game = new Game(makeGameState({}));
            const config = makeConfig({ game }, { views: [view] });
            const history = makeHistory({ game, config }, {
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
            const view = makeView({
                milestones: makeMilestones([
                    "effect:hot",
                    "reset:blackhole",
                    "effect:cold",
                ])
            });

            const game = new Game(makeGameState({}));
            const config = makeConfig({ game }, { views: [view] });
            const history = makeHistory({ game, config }, {
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
