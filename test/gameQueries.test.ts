import { describe, expect, it, jest } from "@jest/globals";
import type { Mock } from "jest-mock";

import { Game } from "../src/game";
import type { Evolve } from "../src/evolve";
import type { RecursivePartial } from "../src/utils";

function makeGameState(global: RecursivePartial<Evolve["global"]>): Evolve {
    return <Evolve> {
        global
    }
}

function mockTechDOM(mock: Mock) {
    Object.defineProperty(global, "$", {
        configurable: true,
        value: mock
    });

    return mock;
}

describe("Game queries", () => {
    it("should provide run number", () => {
        const game = new Game(makeGameState({ stats: { reset: 123 } }));

        expect(game.runNumber).toBe(124);
    });

    it("should provide current run day", () => {
        const game = new Game(makeGameState({ stats: { days: 123 } }));

        expect(game.day).toBe(123);
    });

    it("should provide current universe", () => {
        const game = new Game(makeGameState({ race: { universe: "heavy" } }));

        expect(game.universe).toBe("heavy");
    });

    it("should provide reset counts", () => {
        const game = new Game(makeGameState({ stats: { bioseed: 1, ascend: 2, descend: 3, blackhole: 4 } }));

        expect(game.resetCounts).toEqual({
            "AI Apocalypse": 0,
            "Ascension": 2,
            "Bioseed": 1,
            "Black Hole": 4,
            "Cataclysm": 0,
            "Demonic Infusion": 3,
            "Garden of Eden": 0,
            "MAD": 0,
            "Matrix": 0,
            "Retirement": 0,
            "Terraform": 0
        });
    });

    it("should check if a building is built", () => {
        const game = new Game(makeGameState({ interstellar: { foo: { count: 123 } } }));

        expect(game.built("interstellar", "foo", 123)).toBe(true);
        expect(game.built("interstellar", "foo", 122)).toBe(true);

        expect(game.built("interstellar", "foo", 124)).toBe(false);
        expect(game.built("interstellar", "bar", 1)).toBe(false);
        expect(game.built("space", "foo", 123)).toBe(false);
    });

    it("should check if a project is built", () => {
        const game = new Game(makeGameState({ arpa: { foo: { rank: 123 } } }));

        expect(game.built("arpa", "foo", 123)).toBe(true);
        expect(game.built("arpa", "foo", 122)).toBe(true);

        expect(game.built("arpa", "foo", 124)).toBe(false);
        expect(game.built("arpa", "bar", 1)).toBe(false);
    });

    it("should check if a tech is researched", () => {
        const game = new Game(makeGameState({}));

        {
            const mock = mockTechDOM(jest.fn(() => []));
            expect(game.researched("sundial")).toBe(false);
            expect(mock).toHaveBeenCalledWith("#tech-sundial .oldTech");
        }
        {
            const mock = mockTechDOM(jest.fn(() => [{}]));
            expect(game.researched("sundial")).toBe(true);
            expect(mock).toHaveBeenCalledWith("#tech-sundial .oldTech");
        }
    });

    it("should check if womlings arrived", () => {
        function makeGameObject(race: Partial<Evolve["global"]["race"]>) {
            return new Game(makeGameState({ race }));
        }

        expect(makeGameObject({ servants: {} }).womlingsArrived()).toBe(true);
        expect(makeGameObject({}).womlingsArrived()).toBe(false);
    });
});
