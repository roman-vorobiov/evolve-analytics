import { describe, expect, it } from "@jest/globals";
import { makeConfig, makeView, makeMilestones, makeGameState } from "./fixture";

import colorScheme from "../src/enums/colorSchemes";
import type { universes } from "../src/enums";
import { Game } from "../src/game";

describe("Config", () => {
    it("should have no views by default", () => {
        const config = makeConfig({});

        expect(config.openViewIndex).toBeUndefined();
        expect(config.views).toEqual([]);
    });

    describe("Adding views", () => {
        it("should append new views at the end", () => {
            const config = makeConfig({});

            const view1 = config.addView();
            expect(config.openViewIndex).toEqual(0);

            const view2 = config.addView();
            expect(config.openViewIndex).toEqual(1);

            const view3 = config.addView();
            expect(config.openViewIndex).toEqual(2);

            expect(config.views).toEqual([view1, view2, view3]);
        });

        it("should insert the cloned view after the original", () => {
            const config = makeConfig({
                views: [
                    makeView({}),
                    makeView({})
                ]
            });

            const [view1, view2] = config.views;

            const view3 = config.cloneView(view1);
            expect(config.openViewIndex).toEqual(1);

            expect(config.views).toEqual([view1, view3, view2]);
        });

        it.each(<Array<keyof typeof universes>> [
            "antimatter",
            "heavy"
        ])("should use the current universe", (universe) => {
            const game = new Game(makeGameState({ global: { race: { universe } } }));
            const config = makeConfig({ game }, {});

            const view = config.addView();

            expect(config.views).toEqual([view]);

            expect(view).toEqual({
                mode: "timestamp",
                showBars: true,
                showLines: false,
                fillArea: false,
                smoothness: 0,
                resetType: "ascend",
                universe,
                includeCurrentRun: false,
                numRuns: { enabled: false },
                skipRuns: { enabled: false },
                milestones: {
                    "reset:ascend": { index: 0, enabled: true, color: colorScheme.blue }
                },
                additionalInfo: []
            });
        });
    });

    describe("Removing views", () => {
        it("should remove existing views", () => {
            const config = makeConfig({
                views: [
                    makeView({
                        milestones: makeMilestones(["reset:ascend"])
                    })
                ]
            });

            const originalView = config.views[0];
            const removedView = config.removeView(originalView);

            expect(removedView).toBe(originalView);
            expect(config.views).toEqual([]);
        });

        it("should not remove unknown views", () => {
            const config = makeConfig({
                views: [
                    makeView({
                        milestones: makeMilestones(["reset:ascend"])
                    }),
                    makeView({
                        milestones: makeMilestones(["reset:ascend"])
                    })
                ]
            });

            const originalViews = config.views.slice();
            const removedView = config.removeView(originalViews[1]);

            expect(removedView).toBe(originalViews[1]);
            expect(config.views).toEqual([originalViews[0]]);
        });

        it("should open the view on the left of the deleted one (if one exists)", () => {
            const config = makeConfig({
                views: [
                    makeView({}),
                    makeView({}),
                    makeView({}),
                    makeView({})
                ]
            });

            const [view1, view2, view3, view4] = config.views;

            config.removeView(view3);

            expect(config.openViewIndex).toEqual(1);
            expect(config.views).toEqual([view1, view2, view4]);
        });

        it("should open the view on the right of the deleted one (if it was the 1st one)", () => {
            const config = makeConfig({
                views: [
                    makeView({}),
                    makeView({}),
                    makeView({})
                ]
            });

            const [view1, view2, view3] = config.views;

            config.openViewIndex = 0;
            config.removeView(view1);

            expect(config.openViewIndex).toEqual(0);
            expect(config.views).toEqual([view2, view3]);
        });

        it("should reset the open view index if the last view is deleted", () => {
            const config = makeConfig({
                views: [
                    makeView({})
                ]
            });

            config.removeView(config.views[0]);

            expect(config.openViewIndex).toEqual(undefined);
            expect(config.views).toEqual([]);
        });
    });

    describe("Views", () => {
        describe("Milestones", () => {
            it("should not add duplicate milestones", () => {
                const config = makeConfig({
                    views: [
                        makeView({
                            milestones: makeMilestones(["reset:ascend", "tech:club"])
                        })
                    ]
                });

                config.views[0].addMilestone("tech:club");

                expect(config.views[0].milestones).toEqual({
                    "reset:ascend": { index: 0, enabled: true, color: colorScheme.blue },
                    "tech:club": { index: 1, enabled: true, color: colorScheme.orange },
                });
            });

            it("should use colors scheme", () => {
                const config = makeConfig({
                    views: [
                        makeView({
                            milestones: makeMilestones(["reset:ascend"])
                        })
                    ]
                });

                config.views[0].addMilestone("tech:wheel");
                config.views[0].addMilestone("tech:club");
                config.views[0].addMilestone("tech:housing");

                expect(config.views[0].milestones).toEqual({
                    "reset:ascend": { index: 0, enabled: true, color: colorScheme.blue },
                    "tech:wheel": { index: 1, enabled: true, color: colorScheme.orange },
                    "tech:club": { index: 2, enabled: true, color: colorScheme.red },
                    "tech:housing": { index: 3, enabled: true, color: colorScheme.cyan }
                });
            });

            it("should use predefined colors for effects", () => {
                const config = makeConfig({
                    views: [
                        makeView({
                            milestones: makeMilestones(["reset:ascend"])
                        })
                    ]
                });

                config.views[0].addMilestone("effect:hot");

                expect(config.views[0].milestones).toEqual({
                    "reset:ascend": { index: 0, enabled: true, color: colorScheme.blue },
                    "effect:hot": { index: 1, enabled: true, color: colorScheme.red }
                });
            });

            it("should remove existing milestones", () => {
                const config = makeConfig({
                    views: [
                        makeView({
                            milestones: makeMilestones(["reset:ascend", "tech:club"])
                        })
                    ]
                });

                config.views[0].removeMilestone("tech:club");

                expect(config.views[0].milestones).toEqual({
                    "reset:ascend": { index: 0, enabled: true, color: colorScheme.blue }
                });
            });

            it("should not remove unknown milestones", () => {
                const config = makeConfig({
                    views: [
                        makeView({
                            milestones: makeMilestones(["reset:ascend", "tech:club"])
                        })
                    ]
                });

                config.views[0].removeMilestone("tech:wheel");

                expect(config.views[0].milestones).toEqual({
                    "reset:ascend": { index: 0, enabled: true, color: colorScheme.blue },
                    "tech:club": { index: 1, enabled: true, color: colorScheme.orange }
                });
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

                config.views[0].removeMilestone("tech:wheel");

                expect(config.views[0].milestones).toEqual({
                    "tech:club": { index: 0, enabled: true, color: colorScheme.blue },
                    "reset:ascend": { index: 1, enabled: true, color: colorScheme.red }
                });
            });

            it("should toggle milestones", () => {
                const config = makeConfig({
                    views: [
                        makeView({
                            milestones: makeMilestones(["reset:ascend"])
                        })
                    ]
                });

                config.views[0].toggleMilestone("reset:ascend");

                expect(config.views[0].milestones).toEqual({
                    "reset:ascend": { index: 0, enabled: false, color: colorScheme.blue }
                });
            });

            it("should move milestones", () => {
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

                config.views[0].moveMilestone(1, 2);

                expect(config.views[0].milestones).toEqual({
                    "tech:club": { index: 0, enabled: true, color: colorScheme.blue },
                    "tech:wheel": { index: 2, enabled: true, color: colorScheme.orange },
                    "reset:ascend": { index: 1, enabled: true, color: colorScheme.red }
                });
            });

            it("should update milestones when switching reset types", () => {
                const config = makeConfig({
                    views: [
                        makeView({
                            milestones: makeMilestones({ "reset:ascend": { index: 1, enabled: false, color: colorScheme.gray } })
                        })
                    ]
                });

                config.views[0].resetType = "matrix";

                expect(config.views[0]).toMatchObject({
                    resetType: "matrix",
                    milestones: {
                        "reset:matrix": { index: 1, enabled: false, color: colorScheme.gray }
                    }
                });
            });
        });
    });
});
