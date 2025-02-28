import { transformMap } from "../utils";
import type { ViewConfig, Config } from "../config";
import type { RunHistory } from "../history";
import type { LatestRun } from "../pendingRun";

function rename(milestone: string) {
    return milestone.replace("harbour", "harbor");
}

function migrateMilestones<T>(milestones: Record<string, T>) {
    return transformMap(milestones, ([milestone, day]) => [rename(milestone), day]);
}

function migrateView(view: ViewConfig) {
    view.milestones = migrateMilestones(view.milestones);
}

function migrateConfig(config: Config) {
    for (const view of config.views) {
        migrateView(view);
    }

    config.version = 9;
}

function migrateHistory(history: RunHistory) {
    history.milestones = migrateMilestones(history.milestones);
}

function migrateLatestRun(latestRun: LatestRun) {
    latestRun.milestones = migrateMilestones(latestRun.milestones);
}

export function migrate8(config: Config, history: RunHistory, latestRun: LatestRun | null) {
    migrateConfig(config);

    migrateHistory(history);

    if (latestRun !== null) {
        migrateLatestRun(latestRun);
    }
}
