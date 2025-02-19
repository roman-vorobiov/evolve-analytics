import { describe, expect, it } from "@jest/globals";

import { migrate15 } from "../../src/migration/15";

describe("Migration", () => {
    describe("15 -> 16", () => {
        it("should default initialize numRuns and skipRuns", () => {
            const config = {
                version: 14,
                views: [
                    {
                        resetType: "ascension",
                        mode: "timestamp",
                        smoothness: 0,
                        showBars: true,
                        showLines: false,
                        fillArea: false,
                        milestones: {},
                        additionalInfo: []
                    }
                ]
            };

            migrate15(config as any);

            expect(config).toEqual({
                version: 16,
                views: [
                    {
                        resetType: "ascension",
                        mode: "timestamp",
                        smoothness: 0,
                        showBars: true,
                        showLines: false,
                        fillArea: false,
                        numRuns: { enabled: false },
                        skipRuns: { enabled: false },
                        milestones: {},
                        additionalInfo: []
                    }
                ]
            });
        });

        it("should use numRuns value", () => {
            const config = {
                version: 14,
                views: [
                    {
                        resetType: "ascension",
                        mode: "timestamp",
                        smoothness: 0,
                        showBars: true,
                        showLines: false,
                        fillArea: false,
                        numRuns: 123,
                        milestones: {},
                        additionalInfo: []
                    }
                ]
            };

            migrate15(config as any);

            expect(config).toEqual({
                version: 16,
                views: [
                    {
                        resetType: "ascension",
                        mode: "timestamp",
                        smoothness: 0,
                        showBars: true,
                        showLines: false,
                        fillArea: false,
                        numRuns: { enabled: true, value: 123 },
                        skipRuns: { enabled: false },
                        milestones: {},
                        additionalInfo: []
                    }
                ]
            });
        });
    });
});
