import { describe, expect, it } from "@jest/globals";
import { makeGameState } from "./fixture";

import { inferResetType, isCurrentRun, isPreviousRun, type LatestRun } from "../src/runTracking";
import { Game } from "../src/game";

function makeRunStats(info: Partial<LatestRun>): LatestRun {
    return {
        run: 1,
        universe: "standard",
        resets: {},
        totalDays: 123,
        milestones: {},
        ...info
    };
}

describe("Latest run info", () => {
    describe("Reset type inference", () => {
        it("should detect reset type based on the reset counts difference", () => {
            const game = new Game(makeGameState({ bioseed: 3 }));

            const run = makeRunStats({ universe: "heavy", resets: { mad: 3, bioseed: 2, blackhole: 1 } });

            expect(inferResetType(run, game)).toBe("bioseed");
        });

        it("should detect new reset types", () => {
            const game = new Game(makeGameState({ mad: 3, ascend: 1 }));

            const run = makeRunStats({ universe: "heavy", resets: { mad: 3 } });

            expect(inferResetType(run, game)).toBe("ascend");
        });

        it("should handle invalid records", () => {
            const game = new Game(makeGameState({ mad: 3 }));

            const run = makeRunStats({ universe: "heavy", resets: { mad: 3 } });

            expect(inferResetType(run, game)).toBe("unknown");
        });
    });

    describe("Run order inference", () => {
        it("should detect current run", () => {
            const game = new Game(makeGameState({ reset: 123, days: 456 }));

            expect(isCurrentRun(makeRunStats({ run: 124, totalDays: 455 }), game)).toBe(true);
            expect(isCurrentRun(makeRunStats({ run: 124, totalDays: 456 }), game)).toBe(true);

            expect(isCurrentRun(makeRunStats({ run: 124, totalDays: 457 }), game)).toBe(false);
            expect(isCurrentRun(makeRunStats({ run: 123, totalDays: 455 }), game)).toBe(false);
            expect(isCurrentRun(makeRunStats({ run: 125, totalDays: 455 }), game)).toBe(false);
        });

        it("should detect previous run", () => {
            const game = new Game(makeGameState({ reset: 123 }));

            expect(isPreviousRun(makeRunStats({ run: 123 }), game)).toBe(true);

            expect(isPreviousRun(makeRunStats({ run: 122 }), game)).toBe(false);
            expect(isPreviousRun(makeRunStats({ run: 124 }), game)).toBe(false);
        });
    });
});
