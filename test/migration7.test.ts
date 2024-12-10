import { describe, expect, it } from "@jest/globals";

import { migrate7 } from "../src/migration/7";

function makeView(mode: string) {
    return {
        resetType: "ascension",
        mode,
        milestones: {},
        additionalInfo: []
    }
}

describe("Migration", () => {
    describe("7 -> 8", () => {
        it("should translate 'total' mode", () => {
            const oldConfig = {
                version: 7,
                views: [makeView("total")]
            };

            expect(migrate7(oldConfig as any)).toEqual({
                version: 8,
                views: [
                    {
                        resetType: "ascension",
                        mode: "timestamp",
                        showBars: false,
                        showLines: true,
                        fillArea: false,
                        smoothness: 0,
                        milestones: {},
                        additionalInfo: []
                    }
                ]
            });
        });

        it("should translate 'filled' mode", () => {
            const oldConfig = {
                version: 7,
                views: [makeView("filled")]
            };

            expect(migrate7(oldConfig as any)).toEqual({
                version: 8,
                views: [
                    {
                        resetType: "ascension",
                        mode: "timestamp",
                        showBars: false,
                        showLines: true,
                        fillArea: true,
                        smoothness: 0,
                        milestones: {},
                        additionalInfo: []
                    }
                ]
            });
        });

        it("should translate 'bars' mode", () => {
            const oldConfig = {
                version: 7,
                views: [makeView("bars")]
            };

            expect(migrate7(oldConfig as any)).toEqual({
                version: 8,
                views: [
                    {
                        resetType: "ascension",
                        mode: "timestamp",
                        showBars: true,
                        showLines: false,
                        fillArea: false,
                        smoothness: 0,
                        milestones: {},
                        additionalInfo: []
                    }
                ]
            });
        });

        it("should translate 'barsSegmented' mode", () => {
            const oldConfig = {
                version: 7,
                views: [makeView("barsSegmented")]
            };

            expect(migrate7(oldConfig as any)).toEqual({
                version: 8,
                views: [
                    {
                        resetType: "ascension",
                        mode: "duration",
                        showBars: true,
                        showLines: false,
                        fillArea: false,
                        smoothness: 0,
                        milestones: {},
                        additionalInfo: []
                    }
                ]
            });
        });

        it("should translate 'segmented' mode", () => {
            const oldConfig = {
                version: 7,
                views: [makeView("segmented")]
            };

            expect(migrate7(oldConfig as any)).toEqual({
                version: 8,
                views: [
                    {
                        resetType: "ascension",
                        mode: "duration",
                        showBars: false,
                        showLines: true,
                        fillArea: false,
                        smoothness: 0,
                        milestones: {},
                        additionalInfo: []
                    }
                ]
            });
        });

        it("should discard daysScale field", () => {
            const oldConfig = {
                version: 7,
                views: [
                    {
                        ...makeView("total"),
                        daysScale: 123
                    }
                ]
            };

            expect(migrate7(oldConfig as any)).toEqual({
                version: 8,
                views: [
                    {
                        resetType: "ascension",
                        mode: "timestamp",
                        showBars: false,
                        showLines: true,
                        fillArea: false,
                        smoothness: 0,
                        milestones: {},
                        additionalInfo: []
                    }
                ]
            });
        });
    });
});
