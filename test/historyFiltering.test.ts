import { describe, expect, it } from "@jest/globals";
import { makeGameState } from "./fixture";

import { Game } from "../src/game";
import { HistoryManager, type RunHistory } from "../src/history";
import { ConfigManager } from "../src/config";
import { applyFilters } from "../src/exports/historyFiltering";
import type { ViewConfig } from "../src/config";

function makeHistory(game: Game, history: RunHistory): HistoryManager {
    const config = new ConfigManager(game, {
        version: 5,
        recordRuns: true,
        views: []
    });

    return new HistoryManager(game, config, history);
}

function makeView(fields: Partial<ViewConfig>): ViewConfig {
    return {
        mode: "total",
        resetType: "mad",
        milestones: {},
        additionalInfo: [],
        ...fields
    };
}

describe("Export", () => {
    describe("Filtering", () => {
        it("should filter by reset type", () => {
            const game = new Game(makeGameState({}));
            const history = makeHistory(game, {
                milestones: { "tech:club": 0, "reset:mad": 1, "reset:bioseed": 2 },
                runs: [
                    { run: 1, universe: "standard", milestones: [[1, 10]] },
                    { run: 2, universe: "heavy", milestones: [[2, 10]] }
                ]
            });

            expect(applyFilters(history, makeView({ resetType: "mad" }))).toEqual([
                history.runs[0]
            ]);

            expect(applyFilters(history, makeView({ resetType: "bioseed" }))).toEqual([
                history.runs[1]
            ]);
        });

        it("should filter by universe", () => {
            const game = new Game(makeGameState({}));
            const history = makeHistory(game, {
                milestones: { "tech:club": 0, "reset:mad": 1 },
                runs: [
                    { run: 1, universe: "standard", milestones: [[1, 10]] },
                    { run: 2, universe: "heavy", milestones: [[1, 10]] },
                ]
            });

            expect(applyFilters(history, makeView({ universe: "standard" }))).toEqual([
                history.runs[0]
            ]);

            expect(applyFilters(history, makeView({ universe: "heavy" }))).toEqual([
                history.runs[1]
            ]);

            expect(applyFilters(history, makeView({ universe: undefined }))).toEqual([
                history.runs[0],
                history.runs[1]
            ]);
        });

        it("should filter last N runs", () => {
            const game = new Game(makeGameState({}));
            const history = makeHistory(game, {
                milestones: { "tech:club": 0, "reset:mad": 1 },
                runs: [
                    { run: 1, universe: "heavy", milestones: [[1, 10]] },
                    { run: 2, universe: "standard", milestones: [[1, 10]] },
                    { run: 3, universe: "heavy", milestones: [[1, 10]] },
                ]
            });

            expect(applyFilters(history, makeView({ numRuns: 2 }))).toEqual([
                history.runs[1],
                history.runs[2]
            ]);
        });

        it("should apply the numRuns filter after the others", () => {
            const game = new Game(makeGameState({}));
            const history = makeHistory(game, {
                milestones: { "tech:club": 0, "reset:mad": 1 },
                runs: [
                    { run: 1, universe: "standard", milestones: [[1, 10]] },
                    { run: 2, universe: "heavy", milestones: [[1, 10]] },
                    { run: 3, universe: "standard", milestones: [[1, 10]] },
                    { run: 4, universe: "heavy", milestones: [[1, 10]] },
                    { run: 5, universe: "standard", milestones: [[1, 10]] },
                    { run: 6, universe: "heavy", milestones: [[1, 10]] },
                ]
            });

            expect(applyFilters(history, makeView({ universe: "standard", numRuns: 2 }))).toEqual([
                history.runs[2],
                history.runs[4]
            ]);
        });
    });
});
