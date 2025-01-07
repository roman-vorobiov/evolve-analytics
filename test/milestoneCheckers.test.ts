import { describe, expect, it, jest } from "@jest/globals";
import { makeGameState } from "./fixture";

import { Game } from "../src/game";
import { makeMilestoneChecker } from "../src/milestones";

describe("Milestones", () => {
    describe("Checkers", () => {
        it("should check if a building is built", () => {
            const game = new Game(makeGameState({}));
            game.built = jest.fn(() => false);

            const milestone = makeMilestoneChecker(game, "built:space-foo:123")!;

            expect(milestone.reached()).toBe(false);
            expect(game.built).toHaveBeenCalledWith("space", "foo", 123);
        });

        it("should check if a tech is researched", () => {
            const game = new Game(makeGameState({}));
            game.researched = jest.fn(() => false);

            const milestone = makeMilestoneChecker(game, "tech:foo")!;

            expect(milestone.reached()).toBe(false);
            expect(game.researched).toHaveBeenCalledWith("foo");
        });

        it("should check if womlings arrived", () => {
            const game = new Game(makeGameState({}));
            game.womlingsArrived = jest.fn(() => false);

            const milestone = makeMilestoneChecker(game, "event:womlings")!;

            expect(milestone.reached()).toBe(false);
            expect(game.womlingsArrived).toHaveBeenCalled();
        });

        it("should check if resource is unlocked", () => {
            const game = new Game(makeGameState({}));
            game.resourceUnlocked = jest.fn(() => false);

            const milestone = makeMilestoneChecker(game, "event:steel")!;

            expect(milestone.reached()).toBe(false);
            expect(game.resourceUnlocked).toHaveBeenCalledWith("Steel");
        });

        it("should check tech level", () => {
            const game = new Game(makeGameState({}));
            game.techLevel = jest.fn(() => 0);
            game.built = jest.fn(() => false);

            const milestone = makeMilestoneChecker(game, "event_condition:elerium")!;

            expect(milestone.reached()).toBe(false);
            expect(game.techLevel).toHaveBeenCalledWith("asteroid");
        });

        it("should check if a building is built (event condition)", () => {
            const game = new Game(makeGameState({}));
            game.techLevel = jest.fn(() => 3);
            game.built = jest.fn(() => false);

            const milestone = makeMilestoneChecker(game, "event_condition:elerium")!;

            expect(milestone.reached()).toBe(false);
            expect(game.techLevel).toHaveBeenCalledWith("asteroid");
            expect(game.built).toHaveBeenNthCalledWith(1, "space", "iron_ship", 1);
            expect(game.built).toHaveBeenNthCalledWith(2, "space", "iridium_ship", 1);
        });

        it("should check demon kills", () => {
            const game = new Game(makeGameState({}));
            game.techLevel = jest.fn(() => 1);
            game.demonKills = jest.fn(() => 0);

            const milestone = makeMilestoneChecker(game, "event_condition:pit")!;

            expect(milestone.reached()).toBe(false);
            expect(game.demonKills).toHaveBeenCalled();
        });
    });
});
