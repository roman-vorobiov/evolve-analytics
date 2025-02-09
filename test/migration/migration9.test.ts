import { describe, expect, it } from "@jest/globals";

import { migrate9 } from "../../src/migration/9";

describe("Migration", () => {
    describe("9 -> 10", () => {
        it("should bump the config version", () => {
            const config = {
                version: 9,
                views: []
            };

            migrate9(config as any, null);

            expect(config).toEqual({
                version: 10,
                views: []
            });
        });

        it("should add effect fields to the latest run", () => {
            const config = {
                version: 9,
                views: []
            };

            const latestRun = {
                milestones: {}
            };

            migrate9(config as any, latestRun as any);

            expect(latestRun).toEqual({
                milestones: {},
                activeEffects: {},
                effectsHistory: [],
            });
        });
    });
});
