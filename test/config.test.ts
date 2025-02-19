import { describe, expect, it } from "@jest/globals";
import { makeConfig, makeView, makeMilestones } from "./fixture";

import colorScheme from "../src/enums/colorSchemes";
import type { View } from "../src/config";

describe("Config", () => {
    it("should collect milestones from each view", () => {
        const config = makeConfig({
            views: [
                makeView({
                    milestones: makeMilestones([
                        "built:city-apartment:1",
                        "built:space-spaceport:2"
                    ])
                }),
                makeView({
                    milestones: makeMilestones([
                        "built:interstellar-mining_droid:3",
                        "built:galaxy-dreadnought:4"
                    ])
                })
            ]
        });

        expect(config.milestones).toEqual([
            "built:city-apartment:1",
            "built:space-spaceport:2",
            "built:interstellar-mining_droid:3",
            "built:galaxy-dreadnought:4"
        ]);
    });

    it("should not duplicate the same milestone", () => {
        const config = makeConfig({
            views: [
                makeView({
                    milestones: makeMilestones([
                        "built:city-apartment:1",
                        "built:space-spaceport:2"
                    ])
                }),
                makeView({
                    milestones: makeMilestones([
                        "built:space-spaceport:2",
                        "built:galaxy-dreadnought:4"
                    ])
                })
            ]
        });

        expect(config.milestones).toEqual([
            "built:city-apartment:1",
            "built:space-spaceport:2",
            "built:galaxy-dreadnought:4"
        ]);
    });

    it("should collect disabled milestones", () => {
        const config = makeConfig({
            views: [
                makeView({
                    milestones: makeMilestones([
                        "built:city-apartment:1",
                        "built:space-spaceport:2"
                    ])
                })
            ]
        });

        config.views[0].toggleMilestone("built:city-apartment:1");

        expect(config.milestones).toEqual([
            "built:city-apartment:1",
            "built:space-spaceport:2"
        ]);
    });

    it("should emit events when a view is added", () => {
        const config = makeConfig({});

        let addedView: View | undefined = undefined;
        config.on("viewAdded", v => { addedView = v; });

        config.addView();

        expect(addedView).toEqual({
            mode: "timestamp",
            showBars: true,
            showLines: false,
            fillArea: false,
            smoothness: 0,
            resetType: "ascend",
            universe: "standard",
            includeCurrentRun: false,
            numRuns: { enabled: false },
            skipRuns: { enabled: false },
            milestones: {
                "reset:ascend": { index: 0, enabled: true, color: colorScheme.blue }
            },
            additionalInfo: []
        });
    });

    it("should emit events when a view is removed", () => {
        const config = makeConfig({
            views: [
                makeView({
                    milestones: makeMilestones(["reset:ascend"])
                })
            ]
        });

        const originalView = config.views[0];

        let removedView: View | undefined = undefined;
        config.on("viewRemoved", v => { removedView = v; });

        config.removeView(originalView);

        expect(removedView).toBe(originalView);
    });

    it("should emit events when a view is modified", () => {
        const config = makeConfig({
            views: [
                makeView({
                    universe: "standard",
                    milestones: makeMilestones(["reset:ascend"])
                })
            ]
        });

        let modifiedView: View | undefined = undefined;
        config.on("viewUpdated", v => { modifiedView = v; });

        config.views[0].universe = "magic";

        expect(modifiedView).toEqual(makeView({ universe: "magic" }));
    });

    it("should emit events when a milestone is added", () => {
        const config = makeConfig({
            views: [
                makeView({
                    milestones: makeMilestones(["reset:ascend"])
                })
            ]
        });

        let modifiedView: View | undefined = undefined;
        config.on("viewUpdated", v => { modifiedView = v; });

        config.views[0].addMilestone("tech:club");

        expect(modifiedView).toEqual(makeView({
            milestones: makeMilestones(["reset:ascend", "tech:club"])
        }));
    });

    it("should use predefined colors for effects", () => {
        const config = makeConfig({
            views: [
                makeView({
                    milestones: makeMilestones(["reset:ascend"])
                })
            ]
        });

        let modifiedView: View | undefined = undefined;
        config.on("viewUpdated", v => { modifiedView = v; });

        config.views[0].addMilestone("effect:hot");

        expect(modifiedView).toEqual(makeView({
            milestones: {
                "reset:ascend": { index: 0, enabled: true, color: colorScheme.blue },
                "effect:hot": { index: 1, enabled: true, color: colorScheme.red }
            }
        }));
    });

    it("should emit events when a milestone is removed", () => {
        const config = makeConfig({
            views: [
                makeView({
                    milestones: makeMilestones(["reset:ascend", "tech:club"])
                })
            ]
        });

        let modifiedView: View | undefined = undefined;
        config.on("viewUpdated", v => { modifiedView = v; });

        config.views[0].removeMilestone("tech:club");

        expect(modifiedView).toEqual(makeView({
            milestones: makeMilestones(["reset:ascend"])
        }));
    });

    it("should update indices when a milestone is removed", () => {
        const config = makeConfig({
            views: [
                makeView({
                    milestones: {
                        "tech:club": { index: 0, enabled: true, color: colorScheme.blue },
                        "tech:wheel": { index: 1, enabled: true, color: colorScheme.orange },
                        "reset:ascend": { index: 2, enabled: true, color: colorScheme.red }
                    }
                })
            ]
        });

        let modifiedView: View | undefined = undefined;
        config.on("viewUpdated", v => { modifiedView = v; });

        config.views[0].removeMilestone("tech:wheel");

        expect(modifiedView).toEqual(makeView({
            milestones: {
                "tech:club": { index: 0, enabled: true, color: colorScheme.blue },
                "reset:ascend": { index: 1, enabled: true, color: colorScheme.red }
            }
        }));
    });

    it("should emit events when a milestone is modified", () => {
        const config = makeConfig({
            views: [
                makeView({
                    milestones: makeMilestones(["reset:ascend"])
                })
            ]
        });

        let modifiedView: View | undefined = undefined;
        config.on("viewUpdated", v => { modifiedView = v; });

        config.views[0].toggleMilestone("reset:ascend");

        expect(modifiedView).toEqual(makeView({
            milestones: {
                "reset:ascend": { index: 0, enabled: false, color: colorScheme.blue }
            }
        }));
    });

    it("should emit events when a milestone is moved", () => {
        const config = makeConfig({
            views: [
                makeView({
                    milestones: {
                        "tech:club": { index: 0, enabled: true, color: colorScheme.blue },
                        "tech:wheel": { index: 1, enabled: true, color: colorScheme.orange },
                        "reset:ascend": { index: 2, enabled: true, color: colorScheme.red }
                    }
                })
            ]
        });

        let modifiedView: View | undefined = undefined;
        config.on("viewUpdated", v => { modifiedView = v; });

        config.views[0].moveMilestone("tech:wheel", 2);

        expect(modifiedView).toEqual(makeView({
            milestones: {
                "tech:club": { index: 0, enabled: true, color: colorScheme.blue },
                "tech:wheel": { index: 2, enabled: true, color: colorScheme.orange },
                "reset:ascend": { index: 1, enabled: true, color: colorScheme.red }
            }
        }));
    });

    it("should update milestones when switching reset types", () => {
        const config = makeConfig({
            views: [
                makeView({
                    milestones: makeMilestones({ "reset:ascend": { index: 1, enabled: false, color: colorScheme.gray } })
                })
            ]
        });

        let modifiedView: View | undefined = undefined;
        config.on("viewUpdated", v => { modifiedView = v; });

        config.views[0].resetType = "matrix";

        expect(modifiedView).toEqual(makeView({
            resetType: "matrix",
            milestones: {
                "reset:matrix": { index: 1, enabled: false, color: colorScheme.gray }
            }
        }));
    });

    it("should not emit events when the value doesn't change", () => {
        const config = makeConfig({
            views: [
                makeView({
                    milestones: makeMilestones(["reset:ascend"])
                })
            ]
        });

        let modifiedView: View | undefined = undefined;
        config.on("viewUpdated", v => { modifiedView = v; });

        config.views[0].universe = "standard";

        expect(modifiedView).toBeUndefined();
    });

    it("should remember last opened view", () => {
        const config = makeConfig({});

        const view1 = config.addView();
        const view2 = config.addView();
        const view3 = config.addView();

        expect(config.openView).toBe(view3);

        config.viewOpened(view2);
        expect(config.openView).toBe(view2);

        config.removeView(view2);
        expect(config.openView).toBe(view1);

        config.removeView(view1);
        expect(config.openView).toBe(view3);

        config.removeView(view3);
        expect(config.openView).toBeUndefined();
    });
});
