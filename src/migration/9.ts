import type { resets, universes } from "../enums";
import type { Config } from "../config";
import type { LatestRun as LatestRun10 } from "../runTracking";

export type LatestRun9 = {
    run: number,
    starLevel?: number,
    universe?: keyof typeof universes,
    resets: Partial<Record<keyof typeof resets, number>>,
    totalDays: number,
    milestones: Record<string, number>,
    raceName?: string,
    combatDeaths?: number,
    junkTraits?: Record<string, number>,
    activeEffects?: {},
    effectsHistory?: []
}

function migrateConfig(config: Config) {
    config.version = 10;
}

function migrateLatestRun(latestRun: LatestRun9) {
    latestRun.activeEffects = {};
    latestRun.effectsHistory = [];
}

export function migrate9(config: Config, latestRun: LatestRun9 | null) {
    migrateConfig(config);

    if (latestRun !== null) {
        migrateLatestRun(latestRun);
    }
}
