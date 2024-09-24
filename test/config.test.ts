import { describe, expect, it, beforeEach } from "@jest/globals";
import { LocalStorageMock, makeGameState } from "./fixture";

import { Game } from "../src/game";
import { ConfigManager } from "../src/config";
import type { View, ViewConfig } from "../src/config";

function makeView(milestones: string[]): ViewConfig {
    return {
        mode: "filled",
        resetType: "blackhole",
        universe: "standard",
        milestones: Object.fromEntries(milestones.map(m => [m, true]))
    };
}

function makeConfig(milestoneSets: string[][]) {
    return {
        version: 4,
        views: milestoneSets.map(makeView)
    }
}

describe("Config", () => {
    beforeEach(() => {
        Object.defineProperty(global, "localStorage", {
            configurable: true,
            value: new LocalStorageMock()
        });
    });

    it("should collect milestones from each view", () => {
        const game = new Game(makeGameState({}));
        const config = new ConfigManager(game, makeConfig([
            [
                "built:city-apartment:1",
                "built:space-spaceport:2"
            ],
            [
                "built:interstellar-mining_droid:3",
                "built:galaxy-dreadnought:4"
            ]
        ]));

        expect(config.milestones).toEqual([
            "built:city-apartment:1",
            "built:space-spaceport:2",
            "built:interstellar-mining_droid:3",
            "built:galaxy-dreadnought:4"
        ]);
    });

    it("should not duplicate the same milestone", () => {
        const game = new Game(makeGameState({}));
        const config = new ConfigManager(game, makeConfig([
            [
                "built:city-apartment:1",
                "built:space-spaceport:2"
            ],
            [
                "built:space-spaceport:2",
                "built:galaxy-dreadnought:4"
            ]
        ]));

        expect(config.milestones).toEqual([
            "built:city-apartment:1",
            "built:space-spaceport:2",
            "built:galaxy-dreadnought:4"
        ]);
    });

    it("should not collect disabled milestones", () => {
        const game = new Game(makeGameState({}));
        const config = new ConfigManager(game, makeConfig([
            [
                "built:city-apartment:1",
                "built:space-spaceport:2"
            ]
        ]));

        config.views[0].toggleMilestone("built:city-apartment:1");

        expect(config.milestones).toEqual([
            "built:space-spaceport:2"
        ]);
    });

    it("should emit events when a view is added", () => {
        const game = new Game(makeGameState({}));
        const config = new ConfigManager(game, makeConfig([]));

        let addedView: View | undefined = undefined;
        config.on("viewAdded", v => { addedView = v; });

        config.addView();

        expect(addedView).toEqual({
            mode: "bars",
            resetType: "ascend",
            universe: "standard",
            milestones: {
                "reset:ascend": true
            }
        });
    });

    it("should emit events when a view is removed", () => {
        const game = new Game(makeGameState({}));
        const config = new ConfigManager(game, makeConfig([
            [
                "reset:blackhole"
            ]
        ]));

        const originalView = config.views[0];

        let removedView: View | undefined = undefined;
        config.on("viewRemoved", v => { removedView = v; });

        config.removeView(originalView);

        expect(removedView).toBe(originalView);
    });

    it("should emit events when a view is modified", () => {
        const game = new Game(makeGameState({}));
        const config = new ConfigManager(game, makeConfig([
            [
                "reset:blackhole"
            ]
        ]));

        let modifiedView: View | undefined = undefined;
        config.on("viewUpdated", v => { modifiedView = v; });

        config.views[0].universe = "magic";

        expect(modifiedView).toEqual({
            mode: "filled",
            resetType: "blackhole",
            universe: "magic",
            milestones: {
                "reset:blackhole": true
            }
        });
    });

    it("should emit events when a milestone is added", () => {
        const game = new Game(makeGameState({}));
        const config = new ConfigManager(game, makeConfig([
            [
                "reset:blackhole"
            ]
        ]));

        let modifiedView: View | undefined = undefined;
        config.on("viewUpdated", v => { modifiedView = v; });

        config.views[0].addMilestone("tech:club");

        expect(modifiedView).toEqual({
            mode: "filled",
            resetType: "blackhole",
            universe: "standard",
            milestones: {
                "reset:blackhole": true,
                "tech:club": true
            }
        });
    });

    it("should emit events when a milestone is removed", () => {
        const game = new Game(makeGameState({}));
        const config = new ConfigManager(game, makeConfig([
            [
                "reset:blackhole"
            ]
        ]));

        let modifiedView: View | undefined = undefined;
        config.on("viewUpdated", v => { modifiedView = v; });

        config.views[0].removeMilestone("reset:blackhole");

        expect(modifiedView).toEqual({
            mode: "filled",
            resetType: "blackhole",
            universe: "standard",
            milestones: {}
        });
    });

    it("should emit events when a milestone is modified", () => {
        const game = new Game(makeGameState({}));
        const config = new ConfigManager(game, makeConfig([
            [
                "reset:blackhole"
            ]
        ]));

        let modifiedView: View | undefined = undefined;
        config.on("viewUpdated", v => { modifiedView = v; });

        config.views[0].toggleMilestone("reset:blackhole");

        expect(modifiedView).toEqual({
            mode: "filled",
            resetType: "blackhole",
            universe: "standard",
            milestones: {
                "reset:blackhole": false
            }
        });
    });

    it("should update milestones when switching reset types", () => {
        const game = new Game(makeGameState({}));
        const config = new ConfigManager(game, makeConfig([
            [
                "reset:blackhole"
            ]
        ]));

        let modifiedView: View | undefined = undefined;
        config.on("viewUpdated", v => { modifiedView = v; });

        expect(config.views[0].milestones).toEqual({
            "reset:blackhole": true
        });

        config.views[0].resetType = "matrix";

        expect(config.views[0].milestones).toEqual({
            "reset:matrix": true
        });

        expect(modifiedView).toEqual({
            mode: "filled",
            resetType: "matrix",
            universe: "standard",
            milestones: {
                "reset:matrix": true
            }
        });
    });

    it("should not emit events when the value doesn't change", () => {
        const game = new Game(makeGameState({}));
        const config = new ConfigManager(game, makeConfig([
            [
                "reset:blackhole"
            ]
        ]));

        let modifiedView: View | undefined = undefined;
        config.on("viewUpdated", v => { modifiedView = v; });

        config.views[0].universe = "standard";

        expect(modifiedView).toBeUndefined();
    });
});
