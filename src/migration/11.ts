import type { Config } from "../config";
import type { RunHistory } from "../history";
import type { LatestRun } from "../pendingRun";

function migrateConfig(config: Config) {
    config.version = 12;
}

function migrateHistory(history: RunHistory) {
    for (const run of history.runs) {
        for (const ref of run.milestones) {
            ref[1] = Math.max(0, ref[1]);
        }
    }
}

function migrateLatestRun(latestRun: LatestRun) {
    for (const [milestone, day] of Object.entries(latestRun.milestones)) {
        latestRun.milestones[milestone] = Math.max(0, day);
    }
}

export function migrate11(config: Config, history: RunHistory, latestRun: LatestRun | null) {
    migrateConfig(config);

    migrateHistory(history);

    if (latestRun !== null) {
        migrateLatestRun(latestRun);
    }
}
