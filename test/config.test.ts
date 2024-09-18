import { describe, expect, it } from "@jest/globals";
import { makeGameState } from "./fixture";

import { Game } from "../src/game";
import { ConfigManager } from "../src/config";
import { milestoneName, type Milestone } from "../src/milestones";
import type { ViewConfig } from "../src/config";

function makeView(milestones: Milestone[]): ViewConfig {
    return {
        mode: "Total",
        resetType: "Black Hole",
        universe: "standard",
        milestones
    };
}

function makeConfig(...milestoneSets: Milestone[][]) {
    return {
        version: 3,
        views: milestoneSets.map(makeView)
    }
}

describe("Config", () => {
    it("should collect milestones from each view", () => {
        const game = new Game(makeGameState({}));
        const config = new ConfigManager(game, makeConfig(
            [
                ["Built", "city", "apartment", "Apartment", 1, true],
                ["Built", "space", "spaceport", "Red Spaceport", 2, true]
            ],
            [
                ["Built", "interstellar", "mining_droid", "Alpha Mining Droid", 3, true],
                ["Built", "galaxy", "dreadnought", "Gateway Dreadnought", 4, true]
            ]
        ));

        const milestones = config.milestones.map(milestoneName);
        expect(milestones).toEqual([
            "Apartment",
            "Red Spaceport",
            "Alpha Mining Droid",
            "Gateway Dreadnought"
        ]);
    });

    it("should not duplicate the same milestone", () => {
        const game = new Game(makeGameState({}));
        const config = new ConfigManager(game, makeConfig(
            [
                ["Built", "city", "apartment", "Apartment", 1, true],
                ["Built", "space", "spaceport", "Red Spaceport", 2, true]
            ],
            [
                ["Built", "space", "spaceport", "Red Spaceport", 2, true],
                ["Built", "galaxy", "dreadnought", "Gateway Dreadnought", 4, true]
            ]
        ));

        const milestones = config.milestones.map(milestoneName);
        expect(milestones).toEqual([
            "Apartment",
            "Red Spaceport",
            "Gateway Dreadnought"
        ]);
    });

    it("should not merge the same building with different counts", () => {
        const game = new Game(makeGameState({}));
        const config = new ConfigManager(game, makeConfig(
            [
                ["Built", "city", "apartment", "Apartment", 1, true],
                ["Built", "city", "apartment", "Apartment", 2, true]
            ]
        ));

        const milestones = config.milestones.map(milestoneName);
        expect(milestones).toEqual([
            "Apartment",
            "Apartment"
        ]);
    });

    it("should not merge different milestones with the same name", () => {
        const game = new Game(makeGameState({}));
        const config = new ConfigManager(game, makeConfig(
            [
                ["Built", "city", "apartment", "Apartment", 1, true],
                ["Researched", "apartment", "Apartment", true]
            ]
        ));

        const milestones = config.milestones.map(milestoneName);
        expect(milestones).toEqual([
            "Apartment",
            "Apartment"
        ]);
    });

    it("should not collect disabled milestones", () => {
        const game = new Game(makeGameState({}));
        const config = new ConfigManager(game, makeConfig(
            [
                ["Built", "city", "apartment", "Apartment", 1, false],
                ["Built", "space", "spaceport", "Red Spaceport", 2, true]
            ]
        ));

        const milestones = config.milestones.map(milestoneName);
        expect(milestones).toEqual([
            "Red Spaceport"
        ]);
    });
});
