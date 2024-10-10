import { describe, expect, it } from "@jest/globals";
import { makeGameState } from "./fixture";

import { inferResetType, type LatestRun } from "../src/runTracking";
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
});
