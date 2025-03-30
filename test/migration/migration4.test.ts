import { describe, expect, it } from "@jest/globals";

import { migrate4 } from "../../src/migration/4";

describe("Migration", () => {
    describe("4 -> 6", () => {
        it("should force the recordRuns field", () => {
            const config = {
                version: 4,
                views: []
            };

            migrate4(config as any);

            expect(config).toEqual({
                version: 6,
                recordRuns: true,
                views: []
            });
        });

        it("should force the additionalInfo field", () => {
            const config = {
                version: 4,
                views: [
                    {
                        resetType: "ascension",
                        mode: "bars",
                        milestones: []
                    }
                ]
            };

            migrate4(config as any);

            expect(config).toEqual({
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
