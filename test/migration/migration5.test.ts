import { describe, expect, it } from "@jest/globals";

import { migrate4 } from "../../src/migration/4";

describe("Migration", () => {
    describe("5 -> 6", () => {
        it("should remove the paused field", () => {
            const oldConfig = {
                version: 5,
                paused: true,
                views: []
            };

            expect(migrate4(oldConfig as any)).toEqual({
                version: 6,
                recordRuns: true,
                views: []
            });
        });

        it("should force the additionalInfo field", () => {
            const oldConfig = {
                version: 5,
                views: [
                    {
                        resetType: "ascension",
                        mode: "bars",
                        milestones: []
                    },
                    {
                        resetType: "ascension",
                        mode: "bars",
                        milestones: [],
                        additionalInfo: ["raceName"]
                    }
                ]
            };

            expect(migrate4(oldConfig as any)).toEqual({
                version: 6,
                recordRuns: true,
                views: [
                    {
                        resetType: "ascension",
                        mode: "bars",
                        milestones: [],
                        additionalInfo: []
                    },
                    {
                        resetType: "ascension",
                        mode: "bars",
                        milestones: [],
                        additionalInfo: ["raceName"]
                    }
                ]
            });
        });
    });
});
