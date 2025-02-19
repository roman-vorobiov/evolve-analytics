import { describe, expect, it } from "@jest/globals";
import { makeViewFactory, makeHistory } from "./fixture";

import { applyFilters } from "../src/exports/historyFiltering";

const makeView = makeViewFactory({ resetType: "mad", universe: undefined });

describe("Export", () => {
    describe("Filtering", () => {
        it("should filter by reset type", () => {
            const history = makeHistory({
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
            const history = makeHistory({
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

        it("should not show vacuum collapse runs if universe is not specified", () => {
            const history = makeHistory({
                milestones: { "reset:blackhole": 1 },
                runs: [
                    { run: 1, universe: "standard", milestones: [[1, 10]] },
                    { run: 2, universe: "heavy", milestones: [[1, 10]] },
                    { run: 3, universe: "magic", milestones: [[1, 10]] }
                ]
            });

            expect(applyFilters(history, makeView({ resetType: "blackhole" }))).toEqual([
                history.runs[0],
                history.runs[1]
            ]);

            expect(applyFilters(history, makeView({ resetType: "blackhole", universe: "magic" }))).toEqual([
                history.runs[2]
            ]);
        });

        it("should filter by star level", () => {
            const history = makeHistory({
                milestones: { "tech:club": 0, "reset:mad": 1 },
                runs: [
                    { run: 1, universe: "standard", milestones: [[1, 10]] },
                    { run: 2, starLevel: 0, universe: "standard", milestones: [[1, 10]] },
                    { run: 3, starLevel: 1, universe: "standard", milestones: [[1, 10]] },
                ]
            });

            expect(applyFilters(history, makeView({ starLevel: 0 }))).toEqual([
                history.runs[1]
            ]);

            expect(applyFilters(history, makeView({ starLevel: 1 }))).toEqual([
                history.runs[2]
            ]);

            expect(applyFilters(history, makeView({ starLevel: 2 }))).toEqual([]);

            expect(applyFilters(history, makeView({ starLevel: undefined }))).toEqual([
                history.runs[0],
                history.runs[1],
                history.runs[2]
            ]);
        });

        it("should skip first N runs", () => {
            const history = makeHistory({
                milestones: { "tech:club": 0, "reset:mad": 1 },
                runs: [
                    { run: 1, universe: "standard", milestones: [[1, 10]] },
                    { run: 2, universe: "heavy", milestones: [[1, 10]] },
                    { run: 3, universe: "heavy", milestones: [[1, 10]] },
                ]
            });

            expect(applyFilters(history, makeView({ universe: "heavy", skipRuns: { enabled: true, value: 1 } }))).toEqual([
                history.runs[2]
            ]);
        });

        it("should filter last N runs", () => {
            const history = makeHistory({
                milestones: { "tech:club": 0, "reset:mad": 1 },
                runs: [
                    { run: 1, universe: "heavy", milestones: [[1, 10]] },
                    { run: 2, universe: "standard", milestones: [[1, 10]] },
                    { run: 3, universe: "heavy", milestones: [[1, 10]] },
                ]
            });

            expect(applyFilters(history, makeView({ numRuns: { enabled: true, value: 2 } }))).toEqual([
                history.runs[1],
                history.runs[2]
            ]);
        });

        it("should apply the numRuns filter after the others", () => {
            const history = makeHistory({
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

            expect(applyFilters(history, makeView({ universe: "standard", numRuns: { enabled: true, value: 2 } }))).toEqual([
                history.runs[2],
                history.runs[4]
            ]);
        });

        it("should apply skipRuns before numRuns", () => {
            const history = makeHistory({
                milestones: { "tech:club": 0, "reset:mad": 1 },
                runs: [
                    { run: 1, universe: "standard", milestones: [[1, 10]] },
                    { run: 2, universe: "heavy", milestones: [[1, 10]] },
                    { run: 3, universe: "heavy", milestones: [[1, 10]] },
                ]
            });

            const view = makeView({
                universe: "heavy",
                skipRuns: { enabled: true, value: 1 },
                numRuns: { enabled: true, value: 2 }
            });

            expect(applyFilters(history, view)).toEqual([
                history.runs[2]
            ]);
        });
    });
});
