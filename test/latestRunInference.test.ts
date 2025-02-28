import { describe, expect, it } from "@jest/globals";
import { makeGameState, makeCurrentRun } from "./fixture";

import { inferResetType } from "../src/pendingRun";
import { Game } from "../src/game";

describe("Latest run info", () => {
    describe("Reset type inference", () => {
        it("should detect reset type based on the reset counts difference", () => {
            const game = new Game(makeGameState({ global: { stats: { bioseed: 3 } } }));

            const run = makeCurrentRun({ universe: "heavy", resets: { mad: 3, bioseed: 2, blackhole: 1 } });

            expect(inferResetType(run, game)).toBe("bioseed");
        });

        it("should detect new reset types", () => {
            const game = new Game(makeGameState({ global: { stats: { mad: 3, ascend: 1 } } }));

            const run = makeCurrentRun({ universe: "heavy", resets: { mad: 3 } });

            expect(inferResetType(run, game)).toBe("ascend");
        });

        it("should handle invalid records", () => {
            const game = new Game(makeGameState({ global: { stats: { mad: 3 } } }));

            const run = makeCurrentRun({ universe: "heavy", resets: { mad: 3 } });

            expect(inferResetType(run, game)).toBe("unknown");
        });
    });
});
