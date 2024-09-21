import { describe, expect, it } from "@jest/globals";

import { generateMilestoneNames, milestoneName } from "../src/milestones";

describe("Milestones", () => {
    describe("Names", () => {
        it("should generate a name for the 'built' milestones", () => {
            const [name, discriminator] = milestoneName("built:interstellar-mining_droid:123");

            expect(name).toBe("Alpha Mining Droid");
            expect(discriminator).toBe("123");
        });

        it("should generate a name for the 'tech' milestones", () => {
            const [name, discriminator] = milestoneName("tech:master_craftsman");

            expect(name).toBe("Master Craftsman");
            expect(discriminator).toBe("Research");
        });

        it("should generate a name for the 'event' milestones", () => {
            const [name, discriminator] = milestoneName("event:womlings");

            expect(name).toBe("Womlings arrival");
            expect(discriminator).toBe("Event");
        });

        it("should generate a name for the 'reset' milestones", () => {
            const [name, discriminator] = milestoneName("reset:ascend");

            expect(name).toBe("Ascension");
            expect(discriminator).toBe("Reset");
        });

        it("should not disambiguate if there are no conflicts", () => {
            const names = generateMilestoneNames([
                "built:interstellar-mining_droid:1",
                "tech:master_craftsman"
            ]);

            expect(names).toEqual([
                "Alpha Mining Droid",
                "Master Craftsman"
            ]);
        });

        it("should disambiguate if the same building has different counts", () => {
            const names = generateMilestoneNames([
                "built:interstellar-mining_droid:123",
                "built:interstellar-mining_droid:456",
            ]);

            expect(names).toEqual([
                "Alpha Mining Droid (123)",
                "Alpha Mining Droid (456)"
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
                "Blackhole Stargate (100)"
            ]);
        });

        it("should nto disambiguate if the count matches the number of segments", () => {
            const names = generateMilestoneNames([
                "built:city-apartment:1",
                "built:arpa-lhc:1",
                "built:interstellar-stargate:200"
            ]);

            expect(names).toEqual([
                "Apartment",
                "Supercollider",
                "Blackhole Stargate"
            ]);
        });
    });
});
