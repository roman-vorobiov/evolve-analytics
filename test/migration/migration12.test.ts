import { describe, expect, it } from "@jest/globals";

import { migrate12 } from "../../src/migration/12";

describe("Migration", () => {
    describe("12 -> 13", () => {
        it("should bump the config version", () => {
            const config = {
                version: 12,
                views: []
            };

            const history = {
                milestones: {},
                runs: []
            };

            migrate12(config as any, history);

            expect(config).toEqual({
                version: 13,
                views: []
            });
        });

        it("should change format", () => {
            const config = {
                version: 12,
                views: [
                    {
                        resetType: "ascension",
                        mode: "timestamp",
                        smoothness: 0,
                        showBars: true,
                        showLines: false,
                        fillArea: false,
                        milestones: {
                            "reset:ascension": true,
                            "tech:club": false
                        },
                        additionalInfo: []
                    }
                ]
            };

            const history = {
                milestones: {},
                runs: []
            };

            migrate12(config as any, history as any);

            expect(config).toEqual({
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
                            "reset:ascension": { index: 0, enabled: true },
                            "tech:club": { index: 1, enabled: false }
                        },
                        additionalInfo: []
                    }
                ]
            });
        });

        it("should sort milestones based on the order in the last run", () => {
            const config = {
                version: 12,
                views: [
                    {
                        resetType: "ascension",
                        mode: "timestamp",
                        smoothness: 0,
                        showBars: true,
                        showLines: false,
                        fillArea: false,
                        milestones: {
                            "reset:ascension": true,
                            "tech:club": false,
                            "tech:wheel": true
                        },
                        additionalInfo: []
                    }
                ]
            };

            const history = {
                milestones: {
                    "reset:ascension": 0,
                    "tech:club": 1,
                    "tech:wheel": 2
                },
                runs: [
                    {
                        run: 1,
                        universe: "standard",
                        milestones: [[1, 10], [2, 20], [0, 30]],
                    },
                    {
                        run: 2,
                        universe: "standard",
                        milestones: [[2, 10], [1, 20], [0, 30]],
                    }
                ]
            };

            migrate12(config as any, history as any);

            expect(config).toEqual({
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
                            "reset:ascension": { index: 0, enabled: true },
                            "tech:club": { index: 1, enabled: false },
                            "tech:wheel": { index: 2, enabled: true }
                        },
                        additionalInfo: []
                    }
                ]
            });
        });
    });
});
