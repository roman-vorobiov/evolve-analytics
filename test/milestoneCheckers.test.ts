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
    });
});
