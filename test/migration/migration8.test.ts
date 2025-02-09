import { describe, expect, it } from "@jest/globals";

import { migrate8 } from "../../src/migration/8";

describe("Migration", () => {
    describe("8 -> 9", () => {
        it("should rename milestones in each view", () => {
            const config = {
                version: 8,
                views: [
                    { milestones: { "built:harbour:123": true } },
                    { milestones: { "built:harbour:456": false } },
                    { milestones: { "built:foo:789": true } },
                ]
            };

            const history = {
                milestones: {},
                runs: []
            };

            migrate8(config as any, history, null);

            expect(config).toEqual({
                version: 9,
                views: [
                    { milestones: { "built:harbor:123": true } },
                    { milestones: { "built:harbor:456": false } },
                    { milestones: { "built:foo:789": true } },
                ]
            });
        });

        it("should rename milestones in history", () => {
            const config = {
                version: 8,
                views: []
            };

            const history = {
                milestones: {
                    "built:harbour:123": 1,
                    "built:harbour:456": 2,
                    "built:foo:789": 3,
                },
                runs: []
            };

            migrate8(config as any, history, null);

            expect(history).toEqual({
                milestones: {
                    "built:harbor:123": 1,
                    "built:harbor:456": 2,
                    "built:foo:789": 3,
                },
                runs: []
            });
        });

        it("should rename milestones in the latest run", () => {
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
                    "built:harbour:123": 1,
                    "built:harbour:456": 2,
                    "built:foo:789": 3,
                }
            };

            migrate8(config as any, history, latestRun as any);

            expect(latestRun).toEqual({
                milestones: {
                    "built:harbor:123": 1,
                    "built:harbor:456": 2,
                    "built:foo:789": 3,
                }
            });
        });
    });
});
