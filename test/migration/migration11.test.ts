import { describe, expect, it } from "@jest/globals";

import { migrate11 } from "../../src/migration/11";

describe("Migration", () => {
    describe("11 -> 12", () => {
        it("should bump the config version", () => {
            const config = {
                version: 11,
                views: []
            };

            const history = {
                milestones: {},
                runs: []
            };

            migrate11(config as any, history, null);

            expect(config).toEqual({
                version: 12,
                views: []
            });
        });

        it("should fix negative days in history", () => {
            const config = {
                version: 11,
                views: []
            };

            const history = {
                milestones: {
                    "built:foo:123": 0
                },
                runs: [{
                    run: 1,
                    universe: "standard",
                    milestones: [[0, -1], [0, 2]],
                }]
            };

            migrate11(config as any, history as any, null);

            expect(history).toEqual({
                milestones: {
                    "built:foo:123": 0,
                },
                runs: [{
                    run: 1,
                    universe: "standard",
                    milestones: [[0, 0], [0, 2]],
                }]
            });
        });

        it("should fix negative days in the latest run", () => {
            const config = {
                version: 8,
                views: []
            };

            const history = {
                milestones: {},
                runs: []
            };

            const latestRun = {
                milestones: {
                    "built:foo:123": -1,
                    "built:foo:456": 2
                }
            };

            migrate11(config as any, history, latestRun as any);

            expect(latestRun).toEqual({
                milestones: {
                    "built:foo:123": 0,
                    "built:foo:456": 2
                }
            });
        });
    });
});
