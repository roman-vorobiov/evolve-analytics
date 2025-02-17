import { describe, expect, it, jest } from "@jest/globals";
import type { Mock } from "jest-mock";
import { makeGameState } from "./fixture";

import { Game } from "../src/game";
import type { Evolve } from "../src/evolve";

function mockTechDOM(mock: Mock) {
    (global as any).$ = mock;

    return mock;
}

describe("Game queries", () => {
    it("should provide run number", () => {
        const game = new Game(makeGameState({ global: { stats: { reset: 123 } } }));

        expect(game.runNumber).toBe(124);
    });

    it("should provide current run day", () => {
        const game = new Game(makeGameState({ global: { stats: { days: 123 } } }));

        expect(game.day).toBe(123);
    });

    it("should provide current universe", () => {
        const game = new Game(makeGameState({ global: { race: { universe: "heavy" } } }));

        expect(game.universe).toBe("heavy");
    });

    it("should not provide 'bigbang' as current universe", () => {
        const game = new Game(makeGameState({ global: { race: { universe: "bigbang" } } }));

        expect(game.universe).toBeUndefined();
    });

    it.each([
        [[]],
        [["no_crispr"]],
        [["no_crispr", "no_trade"]]
    ])("should provide current star level", (challengeGenes) => {
        const game = new Game(makeGameState({
            global: {
                race: Object.fromEntries(challengeGenes.map(g => [g, 1]))
            }
        }));

        expect(game.starLevel).toBe(challengeGenes.length);
    });

    it("should provide current race name", () => {
        const evolve = makeGameState({ global: { race: { species: "entish" } } });
        evolve.races["entish"] = { name: "Ent", traits: {} };
        const game = new Game(evolve);

        expect(game.raceName).toBe("Ent");
    });

    it("should not provide a race name during the evolution stage", () => {
        const evolve = makeGameState({ global: { race: { species: "protoplasm" } } });
        evolve.races["protoplasm"] = { name: "Protoplasm", traits: {} };
        const game = new Game(evolve);

        expect(game.raceName).toBeUndefined();
    });

    it("should provide reset counts", () => {
        const game = new Game(makeGameState({
            global: {
                stats: { bioseed: 1, ascend: 2, descend: 3, blackhole: 4 }
            }
        }));

        expect(game.resetCounts).toEqual({
            mad: 0,
            bioseed: 1,
            cataclysm: 0,
            blackhole: 4,
            ascend: 2,
            descend: 3,
            apotheosis: 0,
            aiappoc: 0,
            matrix: 0,
            retire: 0,
            eden: 0,
            terraform: 0
        });
    });

    it("should check if a building is built", () => {
        const game = new Game(makeGameState({ global: { interstellar: { foo: { count: 123 } } } }));

        expect(game.built("interstellar", "foo", 123)).toBe(true);
        expect(game.built("interstellar", "foo", 122)).toBe(true);

        expect(game.built("interstellar", "foo", 124)).toBe(false);
        expect(game.built("interstellar", "bar", 1)).toBe(false);
        expect(game.built("space", "foo", 123)).toBe(false);
    });

    it("should check if a project is built", () => {
        const game = new Game(makeGameState({ global: { arpa: { foo: { rank: 123 } } } }));

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
            return new Game(makeGameState({ global: { race } }));
        }

        expect(makeGameObject({ servants: {} }).womlingsArrived()).toBe(true);
        expect(makeGameObject({}).womlingsArrived()).toBe(false);
    });

    it("should check if resource is unlocked", () => {
        function makeGameObject(resource: Partial<Evolve["global"]["resource"]>) {
            return new Game(makeGameState({ global: { resource } }));
        }

        expect(makeGameObject({ Steel: { display: true } }).resourceUnlocked("Steel")).toBe(true);
        expect(makeGameObject({ Steel: { display: false } }).resourceUnlocked("Steel")).toBe(false);
        expect(makeGameObject({}).resourceUnlocked("Steel")).toBe(false);
    });

    it("should check tech level", () => {
        function makeGameObject(tech: Partial<Evolve["global"]["tech"]>) {
            return new Game(makeGameState({ global: { tech } }));
        }

        expect(makeGameObject({ foo: 123 }).techLevel("foo")).toBe(123);
        expect(makeGameObject({ bar: 123 }).techLevel("foo")).toBe(0);
    });

    it("should check demon kills", () => {
        function makeGameObject(stats: Partial<Evolve["global"]["stats"]>) {
            return new Game(makeGameState({ global: { stats } }));
        }

        expect(makeGameObject({ dkills: 123 }).demonKills()).toBe(123);
        expect(makeGameObject({}).demonKills()).toBe(0);
    });
});
