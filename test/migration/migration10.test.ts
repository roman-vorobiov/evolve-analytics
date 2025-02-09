import { describe, expect, it } from "@jest/globals";

import { migrate10 } from "../../src/migration/10";

describe("Migration", () => {
    describe("10 -> 11", () => {
        it("should bump the config version", () => {
            const config = {
                version: 10,
                views: []
            };

            migrate10(config as any);

            expect(config).toEqual({
                version: 11,
                views: []
            });
        });
    });
});
