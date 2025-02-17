import * as colorSchemes from "../src/enums/colorSchemes";
import { Game } from "../src/game";
import { ConfigManager, type Config } from "../src/config";
import { HistoryManager, type RunHistory } from "../src/history";
import { transformMap } from "../src/utils";
import type { ViewConfig } from "../src/config";
import type { Evolve } from "../src/evolve";
import type { LatestRun } from "../src/runTracking";
import type { RecursivePartial } from "../src/utils";

export class LocalStorageMock {
    store: Record<string, string>;

    constructor() {
        this.store = {};
    }

    clear() {
        this.store = {};
    }

    getItem(key: string): string | null {
        return this.store[key] ?? null;
    }

    setItem(key: string, value: string) {
        this.store[key] = String(value);
    }

    removeItem(key: string) {
        delete this.store[key];
    }
}

function applyOverrides(prototype: any, overrides: any) {
    for (const [k, v] of Object.entries(overrides)) {
        if (typeof prototype[k] === "object") {
            applyOverrides(prototype[k], v);
        }
        else {
            prototype[k] = v;
        }
    }
}

export function makeGameStateFactory(prototypeOverrides: RecursivePartial<Evolve>): (evolve: RecursivePartial<Evolve>) => Evolve {
    return (overrides) => {
        const prototype: Evolve = {
            races: {
                custom: { name: "Oompa Loompa", traits: {} }
            },
            traits: {},
            global: {
                city: <Evolve["global"]["city"]> {
                    calendar: {
                        temp: 1,
                    }
                },
                space: {},
                starDock: {},
                interstellar: {},
                galaxy: {},
                portal: {},
                tauceti: {},
                arpa: {},
                stats: {
                    mad: 0,
                    bioseed: 0,
                    cataclysm: 0,
                    blackhole: 0,
                    ascend: 0,
                    descend: 0,
                    aiappoc: 0,
                    matrix: 0,
                    retire: 0,
                    eden: 0,
                    terraform: 0,
                    apotheosis: 0,
                    reset: 0,
                    days: 0,
                    dkills: 0,
                    died: 0
                },
                race: {
                    species: "custom",
                    universe: "standard"
                },
                resource: {
                },
                tech: {}
            }
        };

        applyOverrides(prototype, prototypeOverrides);
        applyOverrides(prototype, overrides);

        return prototype;
    };
}

export const makeGameState = makeGameStateFactory({});

export function makeMilestones(milestones: string[] | Record<string, Partial<ViewConfig["milestones"][""]>>): ViewConfig["milestones"] {
    const colorScheme = colorSchemes.Observable10;
    const getColor = (idx: number) => colorScheme[idx % colorScheme.length];

    if (Array.isArray(milestones)) {
        return Object.fromEntries(milestones.map((milestone, index) => {
            return [milestone, { index, enabled: true, color: getColor(index) }];
        }));
    }
    else {
        return transformMap(milestones, ([milestone, overrides], index) => {
            return [milestone, { index, enabled: true, color: getColor(index), ...overrides }];
        });
    }
}

export function makeViewFactory(prototypeOverrides: Partial<ViewConfig>): (view: Partial<ViewConfig>) => ViewConfig {
    const prototype: ViewConfig = {
        mode: "timestamp",
        showBars: false,
        showLines: true,
        fillArea: true,
        smoothness: 0,
        resetType: "blackhole",
        universe: "standard",
        milestones: {},
        additionalInfo: [],
        ...prototypeOverrides
    };

    return (overrides) => {
        return { ...prototype, ...overrides };
    };
}

export const makeView = makeViewFactory({});

type ConfigDependenciesSpec = { game?: Game };

export function makeConfig(config: Partial<Config>): ConfigManager;
export function makeConfig(dependencies: ConfigDependenciesSpec, config: Partial<Config>): ConfigManager;
export function makeConfig(arg0: ConfigDependenciesSpec | Partial<Config>, arg1?: Partial<Config>): ConfigManager {
    let dependencies: ConfigDependenciesSpec;
    let config: Partial<Config>;

    if (arg1 === undefined) {
        dependencies = {};
        config = arg0 as Partial<Config>;
    }
    else {
        dependencies = arg0 as ConfigDependenciesSpec;
        config = arg1;
    }

    dependencies.game ??= new Game(makeGameState({}));

    return new ConfigManager(dependencies.game, {
        version: 14,
        recordRuns: true,
        views: [],
        ...config
    });
}

type HistoryDependenciesSpec = { game?: Game, config?: ConfigManager };

export function makeHistory(history: RunHistory): HistoryManager;
export function makeHistory(dependencies: HistoryDependenciesSpec, history: RunHistory): HistoryManager;
export function makeHistory(arg0: HistoryDependenciesSpec | RunHistory, arg1?: RunHistory): HistoryManager {
    let dependencies: HistoryDependenciesSpec;
    let history: RunHistory;

    if (arg1 === undefined) {
        dependencies = {};
        history = arg0 as RunHistory;
    }
    else {
        dependencies = arg0 as HistoryDependenciesSpec;
        history = arg1;
    }

    dependencies.game ??= new Game(makeGameState({}));
    dependencies.config ??= makeConfig({ game: dependencies.game }, {});

    return new HistoryManager(dependencies.game, dependencies.config, history);
}

export function makeCurrentRun(overrides: Partial<LatestRun>): LatestRun {
    return {
        run: 1,
        universe: "standard",
        resets: {},
        totalDays: 123,
        milestones: {},
        activeEffects: {},
        effectsHistory: [],
        ...overrides
    };
}
