import { describe, expect, it } from "@jest/globals";

import { migrate4 } from "../../src/migration/4";

describe("Migration", () => {
    describe("4 -> 6", () => {
        it("should force the recordRuns field", () => {
            const oldConfig = {
                version: 4,
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
                version: 4,
                views: [
                    {
                        resetType: "ascension",
                        mode: "bars",
                        milestones: []
                    }
                ]
            };

            expect(migrate4(oldConfig as any)).toEqual({
                version: 6,
                recordRuns: true,
                lastOpenViewIndex: 0,
                views: [
                    {
                        resetType: "ascension",
                        mode: "bars",
                        milestones: [],
                        additionalInfo: []
                    }
                ]
            });
        });
    });
});
