import { describe, expect, it } from "@jest/globals";

import { migrate14 } from "../../src/migration/14";

describe("Migration", () => {
    describe("14 -> 15", () => {
        it("should bump the config version", () => {
            const config = {
                version: 14,
                views: []
            };

            const history = {
                milestones: {},
                runs: []
            };

            migrate14(config as any, history);

            expect(config).toEqual({
                version: 15,
                views: []
            });
        });

        it("should set star level for known forced 4star resets", () => {
            const config = {
                version: 14,
                views: []
            };

            const history = {
                milestones: {
                    "reset:ascension": 0,
                    "reset:aiappoc": 1,
                },
                runs: [
                    {
                        run: 1,
                        universe: "standard",
                        milestones: [[0, 10]],
                    },
                    {
                        run: 2,
                        universe: "standard",
                        milestones: [[1, 10]],
                    }
                ]
            };

            migrate14(config as any, history as any);

            expect(history).toEqual({
                milestones: {
                    "reset:ascension": 0,
                    "reset:aiappoc": 1,
                },
                runs: [
                    {
                        run: 1,
                        universe: "standard",
                        milestones: [[0, 10]],
                    },
                    {
                        run: 2,
                        universe: "standard",
                        starLevel: 4,
                        milestones: [[1, 10]],
                    }
                ]
            });
        });
    });
});
