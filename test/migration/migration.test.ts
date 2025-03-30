import { describe, expect, it } from "@jest/globals";

import { loadConfig, loadHistory, loadLatestRun } from "../../src/database";
import { migrate } from "../../src/migration";

describe("Migration", () => {
    it("should run all migrations", () => {
        localStorage.setItem("sneed.analytics.config", JSON.stringify({
            version: 4,
            views: [
                {
                    mode: "filled",
                    resetType: "ascend",
                    universe: "heavy",
                    numRuns: 50,
                    milestones: {
                        "built:arpa-launch_facility:123": true,
                        "built:space-world_controller:1": false,
                        "tech:metaphysics": true,
                        "event:womlings": true,
                        "reset:ascend": true
                    }
                }
            ]
        }));

        localStorage.setItem("sneed.analytics.history", JSON.stringify({
            milestones: {
                "built:arpa-launch_facility:123": 0,
                "built:space-world_controller:1": 1,
                "tech:metaphysics": 3,
                "reset:ascend": 7,
                "event:womlings": 8
            },
            runs: [
                {
                    run: 569,
                    universe: "heavy",
                    milestones: [[8, 12], [0, 91], [1, 191], [3, 346], [7, 573]]
                },
                {
                    run: 570,
                    universe: "heavy",
                    milestones: [[8, 78], [0, 97], [1, 200], [3, 381], [7, 599]]
                }
            ]
        }));

        localStorage.setItem("sneed.analytics.latest", JSON.stringify({
            run: 626,
            universe: "heavy",
            totalDays: 179,
            resets: {
                "mad": 234,
                "bioseed": 47,
                "cataclysm": 2,
                "blackhole": 17,
                "ascend": 317,
                "descend": 3,
                "aiappoc": 1,
                "matrix": 1,
                "retire": 1,
                "eden": 1,
                "terraform": 1
            },
            milestones: {
                "event:womlings": 10,
                "built:arpa-launch_facility:123": 96
            }
        }));

        migrate();

        expect(localStorage.getItem("sneed.analytics.config")!.startsWith("{")).toBe(true);
        expect(loadConfig()).toEqual({
            version: 17,
            recordRuns: true,
            lastOpenViewIndex: 0,
            views: [
                {
                    mode: "timestamp",
                    showBars: false,
                    showLines: true,
                    fillArea: true,
                    smoothness: 0,
                    resetType: "ascend",
                    universe: "heavy",
                    numRuns: { enabled: true, value: 50 },
                    skipRuns: { enabled: false },
                    milestones: {
                        "reset:ascend": { index: 0, enabled: true, color: "#4269d0" },
                        "tech:metaphysics": { index: 1, enabled: true, color: "#efb118" },
                        "built:space-world_controller:1": { index: 2, enabled: false, color: "#ff725c" },
                        "built:arpa-launch_facility:123": { index: 3, enabled: true, color: "#6cc5b0" },
                        "event:womlings": { index: 4, enabled: true, color: "#3ca951" }
                    },
                    additionalInfo: []
                }
            ]
        });

        expect(localStorage.getItem("sneed.analytics.history")!.startsWith("N4")).toBe(true);
        expect(loadHistory()).toEqual({
            milestones: {
                "built:arpa-launch_facility:123": 0,
                "built:space-world_controller:1": 1,
                "tech:metaphysics": 3,
                "reset:ascend": 7,
                "event:womlings": 8
            },
            runs: [
                {
                    run: 569,
                    universe: "heavy",
                    milestones: [[8, 12], [0, 91], [1, 191], [3, 346], [7, 573]]
                },
                {
                    run: 570,
                    universe: "heavy",
                    milestones: [[8, 78], [0, 97], [1, 200], [3, 381], [7, 599]]
                }
            ]
        });

        expect(localStorage.getItem("sneed.analytics.latest")!.startsWith("{")).toBe(true);
        expect(loadLatestRun()).toEqual({
            run: 626,
            universe: "heavy",
            totalDays: 179,
            resets: {
                "mad": 234,
                "bioseed": 47,
                "cataclysm": 2,
                "blackhole": 17,
                "ascend": 317,
                "descend": 3,
                "aiappoc": 1,
                "matrix": 1,
                "retire": 1,
                "eden": 1,
                "terraform": 1
            },
            milestones: {
                "event:womlings": 10,
                "built:arpa-launch_facility:123": 96
            },
            activeEffects: {},
            effectsHistory: []
        });
    });

    it("should clear storage if can't migrate", () => {
        localStorage.setItem("sneed.analytics.config", JSON.stringify({
            version: 3,
            views: []
        }));

        localStorage.setItem("sneed.analytics.history", JSON.stringify({
            milestones: {},
            runs: []
        }));

        localStorage.setItem("sneed.analytics.latest", JSON.stringify({
            run: 626,
            universe: "heavy",
            totalDays: 179,
            resets: {},
            milestones: {
                "Womlings arrival": 10,
                "Launch Facility": 96
            }
        }));

        migrate();

        expect(loadConfig()).toBeNull();
        expect(loadHistory()).toBeNull();
        expect(loadLatestRun()).toBeNull();
    });
});
