import { describe, expect, it, beforeEach } from "@jest/globals";
import { LocalStorageMock } from "../fixture";

import { loadConfig, loadHistory, loadLatestRun } from "../../src/database";
import { migrate } from "../../src/migration";

describe("Migration", () => {
    beforeEach(() => {
        Object.defineProperty(global, "localStorage", {
            configurable: true,
            value: new LocalStorageMock()
        });
    });

    it("should run all migrations", () => {
        localStorage.setItem("sneed.analytics.config", JSON.stringify({
            version: 3,
            views: [
                {
                    mode: "Total (filled)",
                    resetType: "Ascension",
                    universe: "heavy",
                    numRuns: 50,
                    milestones: [
                        ["Built", "arpa", "launch_facility", "Launch Facility", 123, true],
                        ["Built", "space", "world_controller", "Dwarf World Collider (Complete)", 1, false],
                        ["Researched", "metaphysics", "Metaphysics", true],
                        ["Event", "Womlings arrival", true],
                        ["Reset", "Ascension", true]
                    ]
                }
            ]
        }));

        localStorage.setItem("sneed.analytics.history", JSON.stringify({
            milestones: {
                "Launch Facility": 0,
                "Dwarf World Collider (Complete)": 1,
                "Metaphysics": 3,
                "Ascension": 7,
                "Womlings arrival": 8,
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
                "MAD": 234,
                "Bioseed": 47,
                "Cataclysm": 2,
                "Black Hole": 17,
                "Ascension": 317,
                "Demonic Infusion": 3,
                "AI Apocalypse": 1,
                "Matrix": 1,
                "Retirement": 1,
                "Garden of Eden": 1,
                "Terraform": 1
            },
            milestones: {
                "Womlings arrival": 10,
                "Launch Facility": 96
            }
        }));

        migrate();

        expect(localStorage.getItem("sneed.analytics.config")!.startsWith("{")).toBe(true);
        expect(loadConfig()).toEqual({
            version: 11,
            recordRuns: true,
            views: [
                {
                    mode: "timestamp",
                    showBars: false,
                    showLines: true,
                    fillArea: true,
                    smoothness: 0,
                    resetType: "ascend",
                    universe: "heavy",
                    numRuns: 50,
                    milestones: {
                        "built:arpa-launch_facility:123": true,
                        "built:space-world_controller:1": false,
                        "tech:metaphysics": true,
                        "event:womlings": true,
                        "reset:ascend": true
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

    it("should discard latest run if it can't be migrated", () => {
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

        expect(loadConfig()).toEqual({
            version: 11,
            recordRuns: true,
            views: []
        });

        expect(loadHistory()).toEqual({
            milestones: {},
            runs: []
        });

        expect(loadLatestRun()).toBeNull();
    });
});
