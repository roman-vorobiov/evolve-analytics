import { describe, expect, it } from "@jest/globals";

import { migrate7 } from "../../src/migration/7";

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
            const config = {
                version: 7,
                views: [makeView("total")]
            };

            migrate7(config as any);

            expect(config).toEqual({
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
            const config = {
                version: 7,
                views: [makeView("filled")]
            };

            migrate7(config as any);

            expect(config).toEqual({
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
            const config = {
                version: 7,
                views: [makeView("bars")]
            };

            migrate7(config as any);

            expect(config).toEqual({
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
            const config = {
                version: 7,
                views: [makeView("barsSegmented")]
            };

            migrate7(config as any);

            expect(config).toEqual({
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
            const config = {
                version: 7,
                views: [makeView("segmented")]
            };

            migrate7(config as any);

            expect(config).toEqual({
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
    });
});
