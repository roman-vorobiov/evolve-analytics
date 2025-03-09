import { describe, expect, it } from "@jest/globals";

import { generateMilestoneNames, milestoneName } from "../src/milestones";
import type { universes } from "../src/enums";

describe("Milestones", () => {
    describe("Names", () => {
        it("should generate a name for the 'built' milestones", () => {
            const { name } = milestoneName("built:interstellar-mining_droid:123");

            expect(name).toBe("Mining Droid");
        });

        it("should generate a name for the 'tech' milestones", () => {
            const { name } = milestoneName("tech:master_craftsman");

            expect(name).toBe("Master Crafter");
        });

        it("should generate a name for the 'event' milestones", () => {
            const { name } = milestoneName("event:womlings");

            expect(name).toBe("Servants Arrival");
        });

        it("should generate a name for the 'reset' milestones", () => {
            const { name } = milestoneName("reset:ascend");

            expect(name).toBe("Ascension");
        });

        it.each([
            { universe: undefined, resetName: "Black Hole" },
            { universe: "heavy", resetName: "Black Hole" },
            { universe: "magic", resetName: "Vacuum Collapse" }
        ])("should adjust the name of the 'blackhole' reset", ({ universe, resetName }) => {
            const { name } = milestoneName("reset:blackhole", universe as keyof typeof universes);

            expect(name).toBe(resetName);
        });

        it("should not disambiguate if there are no conflicts", () => {
            const names = generateMilestoneNames([
                "built:interstellar-mining_droid:1",
                "tech:master_craftsman"
            ]);

            expect(names).toEqual([
                "Mining Droid",
                "Master Crafter"
            ]);
        });

        it("should disambiguate if the same building has different counts", () => {
            const names = generateMilestoneNames([
                "built:interstellar-mining_droid:1",
                "built:interstellar-mining_droid:123",
                "built:interstellar-mining_droid:456",
            ]);

            expect(names).toEqual([
                "Mining Droid (1)",
                "Mining Droid (123)",
                "Mining Droid (456)"
            ]);
        });

        it("should disambiguate if the base name is the same", () => {
            const names = generateMilestoneNames([
                "built:city-apartment:123",
                "tech:apartment",
            ]);

            expect(names).toEqual([
                "Apartment (123)",
                "Apartment (Research)"
            ]);
        });

        it("should disambiguate if the count does not match the number of segments", () => {
            const names = generateMilestoneNames([
                "built:city-apartment:123",
                "built:arpa-lhc:456",
                "built:interstellar-stargate:100"
            ]);

            expect(names).toEqual([
                "Apartment (123)",
                "Supercollider (456)",
                "Stargate (100)"
            ]);
        });

        it("should not disambiguate if the count matches the number of segments", () => {
            const names = generateMilestoneNames([
                "built:city-apartment:1",
                "built:arpa-lhc:1",
                "built:interstellar-stargate:200"
            ]);

            expect(names).toEqual([
                "Apartment",
                "Supercollider",
                "Stargate"
            ]);
        });
    });
});
