import { describe, expect, it, jest } from "@jest/globals";
import { makeGameState } from "./fixture";

import { Game } from "../src/game";
import { makeMilestoneChecker } from "../src/milestones";

describe("Milestones", () => {
    describe("Factory", () => {
        it("should generate the name for 'Built' milestone types", () => {
            const game = new Game(makeGameState({}));

            const { name } = makeMilestoneChecker(game, ["Built", "", "", "Hello", 123, true])!;
            expect(name).toBe("Hello");
        });

        it("should generate the name for 'Researched' milestone types", () => {
            const game = new Game(makeGameState({}));

            const { name } = makeMilestoneChecker(game, ["Researched", "", "Hello", true])!;
            expect(name).toBe("Hello");
        });

        it("should generate the name for 'Event' milestone types", () => {
            const game = new Game(makeGameState({}));

            const { name } = makeMilestoneChecker(game, ["Event", "Womlings arrival", true])!;
            expect(name).toBe("Womlings arrival");
        });

        it("should not make a checker for the reset milestone types", () => {
            const game = new Game(makeGameState({}));

            const checker = makeMilestoneChecker(game, ["Reset", "Ascension", true]);
            expect(checker).toBeUndefined();
        });
    });

    describe("Built", () => {
        it("should check if a building is built", () => {
            const game = new Game(makeGameState({}));
            game.built = jest.fn(() => false);

            const milestone = makeMilestoneChecker(game, ["Built", "foo", "bar", "baz", 123, true])!;

            expect(milestone.reached()).toBe(false);
            expect(game.built).toHaveBeenCalledWith("foo", "bar", 123);
        });

        it("should check if a tech is researched", () => {
            const game = new Game(makeGameState({}));
            game.researched = jest.fn(() => false);

            const milestone = makeMilestoneChecker(game, ["Researched", "foo", "bar", true])!;

            expect(milestone.reached()).toBe(false);
            expect(game.researched).toHaveBeenCalledWith("foo");
        });

        it("should check if womlings arrived", () => {
            const game = new Game(makeGameState({}));
            game.womlingsArrived = jest.fn(() => false);

            const milestone = makeMilestoneChecker(game, ["Event", "Womlings arrival", true])!;

            expect(milestone.reached()).toBe(false);
            expect(game.womlingsArrived).toHaveBeenCalled();
        });
    });
});
