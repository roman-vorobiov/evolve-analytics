import { describe, expect, it } from "@jest/globals";

import { migrate6 } from "../../src/migration/6";

describe("Migration", () => {
    describe("6 -> 7", () => {
        it("should normalize latest current run universe", () => {
            const config = {
                version: 6,
                views: []
            };

            const history = {
                milestones: {
                    "reset:whitehole": 0,
                },
                runs: []
            };

            const latestRun = {
                run: 123,
                universe: "bigbang",
                resets: { "mad": 1 },
                totalDays: 10,
                milestones: {},
                raceName: "Human"
            };

            migrate6(config, history, latestRun);

            expect(config).toEqual({
                version: 7,
                views: []
            });

            expect(latestRun).toEqual({
                run: 123,
                universe: undefined,
                resets: { "mad": 1 },
                totalDays: 10,
                milestones: {},
                raceName: "Human"
            });
        });

        it("should take the universe from the next run", () => {
            const config = {
                version: 6,
                views: []
            };

            const history = {
                milestones: {
                    "reset:whitehole": 0,
                },
                runs: [
                    { "run": 123, "universe": "bigbang", "milestones": [[0, 123]] },
                    { "run": 124, "universe": "heavy", "milestones": [[0, 456]] }
                ]
            };

            migrate6(config, history, null);

            expect(config).toEqual({
                version: 7,
                views: []
            });

            expect(history).toEqual({
                milestones: {
                    "reset:whitehole": 0,
                },
                runs: [
                    { "run": 123, "universe": "heavy", "milestones": [[0, 123]] },
                    { "run": 124, "universe": "heavy", "milestones": [[0, 456]] }
                ]
            });
        });

        it("should assume magic if multiple bigbangs in a row", () => {
            const config = {
                version: 6,
                views: []
            };

            const history = {
                milestones: {
                    "reset:whitehole": 0,
                },
                runs: [
                    { "run": 123, "universe": "bigbang", "milestones": [[0, 123]] },
                    { "run": 124, "universe": "bigbang", "milestones": [[0, 456]] },
                    { "run": 125, "universe": "heavy", "milestones": [[0, 789]] }
                ]
            };

            migrate6(config, history, null);

            expect(config).toEqual({
                version: 7,
                views: []
            });

            expect(history).toEqual({
                milestones: {
                    "reset:whitehole": 0,
                },
                runs: [
                    { "run": 123, "universe": "magic", "milestones": [[0, 123]] },
                    { "run": 124, "universe": "heavy", "milestones": [[0, 456]] },
                    { "run": 125, "universe": "heavy", "milestones": [[0, 789]] }
                ]
            });
        });

        it("should fail if the last run is bigbang", () => {
            const config = {
                version: 6,
                views: []
            };

            const history = {
                milestones: {
                    "reset:whitehole": 0,
                },
                runs: [
                    { "run": 123, "universe": "bigbang", "milestones": [[0, 123]] },
                    { "run": 124, "universe": "bigbang", "milestones": [[0, 456]] }
                ]
            };

            migrate6(config, history, null);

            expect(config).toEqual({
                version: 6,
                views: []
            });

            expect(history).toEqual({
                milestones: {
                    "reset:whitehole": 0,
                },
                runs: [
                    { "run": 123, "universe": "magic", "milestones": [[0, 123]] },
                    { "run": 124, "universe": "bigbang", "milestones": [[0, 456]] }
                ]
            });
        });
    });
});
