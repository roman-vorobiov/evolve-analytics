import { describe, expect, it } from "@jest/globals";

import { migrate13 } from "../../src/migration/13";

describe("Migration", () => {
    describe("13 -> 14", () => {
        it("should add colors based on the index", () => {
            const config = {
                version: 13,
                views: [
                    {
                        resetType: "ascension",
                        mode: "timestamp",
                        smoothness: 0,
                        showBars: true,
                        showLines: false,
                        fillArea: false,
                        milestones: {
                            "reset:ascension": { index: 1, enabled: true },
                            "tech:club": { index: 0, enabled: false }
                        },
                        additionalInfo: []
                    }
                ]
            };

            migrate13(config as any);

            expect(config).toEqual({
                version: 14,
                views: [
                    {
                        resetType: "ascension",
                        mode: "timestamp",
                        smoothness: 0,
                        showBars: true,
                        showLines: false,
                        fillArea: false,
                        milestones: {
                            "reset:ascension": { index: 1, enabled: true, color: "#efb118" },
                            "tech:club": { index: 0, enabled: false, color: "#4269d0" }
                        },
                        additionalInfo: []
                    }
                ]
            });
        });

        it("should use predefined colors for effects", () => {
            const config = {
                version: 13,
                views: [
                    {
                        resetType: "ascension",
                        mode: "timestamp",
                        smoothness: 0,
                        showBars: true,
                        showLines: false,
                        fillArea: false,
                        milestones: {
                            "effect:hot": { index: 0, enabled: true },
                            "effect:cold": { index: 1, enabled: true },
                            "effect:inspired": { index: 2, enabled: true },
                            "effect:motivated": { index: 3, enabled: true }
                        },
                        additionalInfo: []
                    }
                ]
            };

            migrate13(config as any);

            expect(config).toEqual({
                version: 14,
                views: [
                    {
                        resetType: "ascension",
                        mode: "timestamp",
                        smoothness: 0,
                        showBars: true,
                        showLines: false,
                        fillArea: false,
                        milestones: {
                            "effect:hot": { index: 0, enabled: true, color: "#ff725c" },
                            "effect:cold": { index: 1, enabled: true, color: "#4269d0" },
                            "effect:inspired": { index: 2, enabled: true, color: "#3ca951" },
                            "effect:motivated": { index: 3, enabled: true, color: "#efb118" }
                        },
                        additionalInfo: []
                    }
                ]
            });
        });
    });
});
