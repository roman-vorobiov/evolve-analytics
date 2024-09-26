import { describe, expect, it } from "@jest/globals";

import { migrateConfig, migrateHistory, migrateLatestRun } from "../src/migration/3";

function makeDummyView(fields: any) {
    return {
        milestones: [],
        ...fields
    }
}

describe("Migration", () => {
    describe("3 -> 4", () => {
        describe("Config", () => {
            it("should bump the version", () => {
                const oldConfig = {
                    version: 3,
                    views: []
                };

                expect(migrateConfig(oldConfig as any)).toEqual(expect.objectContaining({
                    version: 4
                }));
            });

            it("should update view mode", () => {
                const oldConfig = {
                    views: [
                        makeDummyView({ mode: "Total" }),
                        makeDummyView({ mode: "Total (filled)" }),
                        makeDummyView({ mode: "Segmented" })
                    ]
                };

                expect(migrateConfig(oldConfig as any)).toEqual(expect.objectContaining({
                    views: [
                        expect.objectContaining({ mode: "total" }),
                        expect.objectContaining({ mode: "filled" }),
                        expect.objectContaining({ mode: "segmented" })
                    ]
                }));
            });

            it("should update reset", () => {
                const oldConfig = {
                    views: [
                        makeDummyView({ resetType: "Ascension" }),
                        makeDummyView({ resetType: "Black Hole" }),
                        makeDummyView({ resetType: "Vacuum Collapse" })
                    ]
                };

                expect(migrateConfig(oldConfig as any)).toEqual(expect.objectContaining({
                    views: [
                        expect.objectContaining({ resetType: "ascend" }),
                        expect.objectContaining({ resetType: "blackhole" }),
                        expect.objectContaining({ resetType: "blackhole" })
                    ]
                }));
            });

            it("should convert milestones", () => {
                const oldConfig = {
                    views: [
                        makeDummyView({
                            milestones: [
                                ["Built", "arpa", "launch_facility", "Launch Facility", 123, true],
                                ["Built", "space", "world_controller", "Dwarf World Collider (Complete)", 1, false],
                                ["Researched", "metaphysics", "Metaphysics", true],
                                ["Event", "Womlings arrival", true],
                                ["Reset", "Ascension", true]
                            ]
                        }),
                    ]
                };

                expect(migrateConfig(oldConfig as any)).toEqual(expect.objectContaining({
                    views: [
                        expect.objectContaining({
                            milestones: {
                                "built:arpa-launch_facility:123": true,
                                "built:space-world_controller:1": false,
                                "tech:metaphysics": true,
                                "event:womlings": true,
                                "reset:ascend": true
                            }
                        })
                    ]
                }));
            });
        });

        describe("History", () => {
            it("should convert milestones that are filtered by 1 view", () => {
                const history = {
                    milestones: {
                        "Apartment": 0,
                        "Dwarf World Collider (Complete)": 1,
                        "Metaphysics": 2,
                        "Womlings arrival": 3,
                        "Ascension": 4
                    },
                    runs: [
                        {
                            "run": 123,
                            "universe": "heavy",
                            "milestones": [[0, 10], [1, 20], [2, 30], [3, 40], [4, 50]]
                        }
                    ]
                };

                const config = {
                    version: 4,
                    views: [
                        {
                            resetType: "ascend",
                            universe: "heavy",
                            milestones: {
                                "built:city-apartment:123": true,
                                "built:space-world_controller:1": false,
                                "tech:metaphysics": true,
                                "event:womlings": true,
                                "reset:ascend": true
                            }
                        }
                    ]
                };

                expect(migrateHistory(history as any, config as any)).toEqual({
                    milestones: {
                        "built:city-apartment:123": 0,
                        "built:space-world_controller:1": 1,
                        "tech:metaphysics": 2,
                        "event:womlings": 3,
                        "reset:ascend": 4
                    },
                    runs: [
                        {
                            "run": 123,
                            "universe": "heavy",
                            "milestones": [[0, 10], [1, 20], [2, 30], [3, 40], [4, 50]]
                        }
                    ]
                });
            });

            it("should convert milestones that are filtered by multiple views in different runs", () => {
                const history = {
                    milestones: {
                        "Apartment": 0,
                        "Ascension": 1
                    },
                    runs: [
                        {
                            "run": 123,
                            "universe": "heavy",
                            "milestones": [[0, 10], [1, 20]]
                        },
                        {
                            "run": 124,
                            "universe": "magic",
                            "milestones": [[0, 10], [1, 20]]
                        }
                    ]
                };

                const config = {
                    version: 4,
                    views: [
                        {
                            resetType: "ascend",
                            universe: "heavy",
                            milestones: {
                                "built:city-apartment:123": true,
                                "reset:ascend": true
                            }
                        },
                        {
                            resetType: "ascend",
                            universe: "magic",
                            milestones: {
                                "built:city-apartment:456": true,
                                "reset:ascend": true
                            }
                        }
                    ]
                };

                expect(migrateHistory(history as any, config as any)).toEqual({
                    milestones: {
                        "reset:ascend": 1,
                        "built:city-apartment:123": 2,
                        "built:city-apartment:456": 3,
                    },
                    runs: [
                        {
                            "run": 123,
                            "universe": "heavy",
                            "milestones": [[2, 10], [1, 20]]
                        },
                        {
                            "run": 124,
                            "universe": "magic",
                            "milestones": [[3, 10], [1, 20]]
                        }
                    ]
                });
            });

            it("should convert milestones that are filtered by multiple views in the same run", () => {
                const history = {
                    milestones: {
                        "Apartment": 0,
                        "Ascension": 1
                    },
                    runs: [
                        {
                            "run": 123,
                            "universe": "heavy",
                            "milestones": [[0, 10], [1, 20]]
                        }
                    ]
                };

                const config = {
                    version: 4,
                    views: [
                        {
                            resetType: "ascend",
                            universe: "heavy",
                            milestones: {
                                "built:city-apartment:123": true,
                                "reset:ascend": true
                            }
                        },
                        {
                            resetType: "ascend",
                            universe: "heavy",
                            milestones: {
                                "built:city-apartment:456": true,
                                "reset:ascend": true
                            }
                        }
                    ]
                };

                expect(migrateHistory(history as any, config as any)).toEqual({
                    milestones: {
                        "reset:ascend": 1,
                        "built:city-apartment:123": 2,
                        "built:city-apartment:456": 3,
                    },
                    runs: [
                        {
                            "run": 123,
                            "universe": "heavy",
                            "milestones": [[3, 10], [1, 20]]
                        }
                    ]
                });
            });

            it("should convert milestones that are not filtered by any views", () => {
                const history = {
                    milestones: {
                        "Apartment": 0,
                        "Dwarf World Collider (Complete)": 1,
                        "Metaphysics": 2,
                        "Womlings arrival": 3,
                        "Ascension": 4
                    },
                    runs: [
                        {
                            "run": 123,
                            "universe": "heavy",
                            "milestones": [[0, 10], [1, 20], [2, 30], [3, 40], [4, 50]]
                        }
                    ]
                };

                const config = {
                    version: 4,
                    views: [
                        {
                            resetType: "ascend",
                            universe: "magic",
                            milestones: {
                                "built:city-apartment:456": true,
                                "reset:ascend": true
                            }
                        }
                    ]
                };

                expect(migrateHistory(history as any, config as any)).toEqual({
                    milestones: {
                        "built:city-apartment:1": 0,
                        "built:space-world_controller:1": 1,
                        "tech:metaphysics": 2,
                        "event:womlings": 3,
                        "reset:ascend": 4
                    },
                    runs: [
                        {
                            "run": 123,
                            "universe": "heavy",
                            "milestones": [[0, 10], [1, 20], [2, 30], [3, 40], [4, 50]]
                        }
                    ]
                });
            });
        });

        describe("Latest run", () => {
            it("should convert resets", () => {
                const run = {
                    run: 123,
                    universe: "heavy",
                    totalDays: 15,
                    milestones: {},
                    resets: {
                        "Black Hole": 123,
                        "Ascension": 456,
                        "Demonic Infusion": 789
                    }
                };

                const config = {
                    version: 4,
                    views: []
                };

                const history = {
                    milestones: {},
                    runs: []
                };

                expect(migrateLatestRun(run as any, config as any, history as any)).toEqual({
                    run: 123,
                    universe: "heavy",
                    totalDays: 15,
                    milestones: {},
                    resets: {
                        "blackhole": 123,
                        "ascend": 456,
                        "descend": 789
                    }
                });
            });

            it("should convert milestone using the last run's view", () => {
                const run = {
                    run: 123,
                    universe: "heavy",
                    totalDays: 15,
                    milestones: {
                        "Apartment": 10
                    },
                    resets: {}
                };

                const config = {
                    version: 4,
                    views: [
                        {
                            mode: "filled",
                            resetType: "ascend",
                            universe: "heavy",
                            milestones: {
                                "built:city-apartment:123": true,
                                "reset:ascend": true
                            }
                        },
                        {
                            mode: "filled",
                            resetType: "ascend",
                            universe: "magic",
                            milestones: {
                                "built:city-apartment:456": true,
                                "reset:ascend": true
                            }
                        }
                    ]
                };

                const history = {
                    milestones: {
                        "built:city-apartment:123": 0,
                        "built:city-apartment:456": 1,
                        "reset:ascend": 2
                    },
                    runs: [
                        {
                            "run": 123,
                            "universe": "heavy",
                            "milestones": [[0, 10], [2, 20]]
                        },
                        {
                            "run": 124,
                            "universe": "heavy",
                            "milestones": [[1, 10], [2, 20]]
                        }
                    ]
                };

                expect(migrateLatestRun(run as any, config as any, history as any)).toEqual({
                    run: 123,
                    universe: "heavy",
                    totalDays: 15,
                    resets: {},
                    milestones: {
                        "built:city-apartment:123": 10
                    },
                });
            });

            it("should discard the run if the history is empty", () => {
                const run = {
                    run: 123,
                    universe: "heavy",
                    totalDays: 15,
                    milestones: {
                        "Apartment": 123
                    },
                    resets: {}
                };

                const config = {
                    version: 4,
                    views: []
                };

                const history = {
                    milestones: {},
                    runs: []
                };

                expect(migrateLatestRun(run as any, config as any, history as any)).toBeNull();
            });

            it("should discard the run if the last entry is not matched by any view", () => {
                const run = {
                    run: 123,
                    universe: "heavy",
                    totalDays: 15,
                    milestones: {
                        "Apartment": 123
                    },
                    resets: {}
                };

                const config = {
                    version: 4,
                    views: [
                        {
                            resetType: "ascend",
                            universe: "heavy",
                            milestones: {
                                "reset:ascend": true
                            }
                        }
                    ]
                };

                const history = {
                    milestones: {
                        "reset:ascend": 0
                    },
                    runs: [
                        {
                            "run": 123,
                            "universe": "magic",
                            "milestones": [[0, 10]]
                        }
                    ]
                };

                expect(migrateLatestRun(run as any, config as any, history as any)).toBeNull();
            });

            it("should discard the run if it contains unknown milestones", () => {
                const run = {
                    run: 123,
                    universe: "heavy",
                    totalDays: 15,
                    milestones: {
                        "Apartment": 123
                    },
                    resets: {}
                };

                const config = {
                    version: 4,
                    views: [
                        {
                            resetType: "ascend",
                            universe: "heavy",
                            milestones: {
                                "reset:ascend": true
                            }
                        }
                    ]
                };

                const history = {
                    milestones: {
                        "reset:ascend": 0
                    },
                    runs: [
                        {
                            "run": 123,
                            "universe": "heavy",
                            "milestones": [[0, 10]]
                        }
                    ]
                };

                expect(migrateLatestRun(run as any, config as any, history as any)).toBeNull();
            });
        });
    });
});
