import { saveCurrentRun, loadLatestRun } from "./database";
import { filterMap } from "./utils";
import type { resets, universes } from "./enums";
import type { Game } from "./game";
import type { ConfigManager } from "./config";
import type { HistoryManager } from "./history";

import { reactive, watch } from "vue";

export type LatestRun = {
    run: number,
    starLevel?: number,
    universe?: keyof typeof universes,
    resets: Partial<Record<keyof typeof resets, number>>,
    totalDays: number,
    milestones: Record<string, number>,
    activeEffects: Record<string, number>,
    effectsHistory: [string, number, number][],
    raceName?: string,
    combatDeaths?: number,
    junkTraits?: Record<string, number>
}

export function inferResetType(runStats: LatestRun, game: Game) {
    const resetCounts = game.resetCounts;

    // Find which reset got incremented
    const reset = Object.keys(resetCounts).find((reset: keyof typeof resets) => {
        return resetCounts[reset] === (runStats.resets[reset] ?? 0) + 1;
    });

    return reset ?? "unknown";
}

function isCurrentRun(runStats: LatestRun, game: Game) {
    return game.finishedEvolution && runStats.run === game.runNumber;
}

function isPreviousRun(runStats: LatestRun, game: Game) {
    return runStats.run === game.runNumber - 1;
}

export function makeNewRunStats(game: Game): LatestRun {
    return {
        run: game.runNumber,
        universe: game.universe,
        resets: game.resetCounts,
        totalDays: game.day,
        milestones: {},
        activeEffects: {},
        effectsHistory: []
    };
}

function restoreToDay(run: LatestRun, day: number): LatestRun {
    return {
        ...run,
        milestones: filterMap(run.milestones, ([, timestamp]) => timestamp <= day),
        activeEffects: filterMap(run.activeEffects, ([, startDay]) => startDay <= day),
        effectsHistory: run.effectsHistory.filter(([,, endDay]) => endDay <= day),
        totalDays: day
    };
}

function prepareCurrentRunImpl(game: Game, config: ConfigManager, history: HistoryManager) {
    const latestRun = loadLatestRun();

    if (latestRun === null) {
        // No pending run - creare a new one
        return makeNewRunStats(game);
    }
    else if (isCurrentRun(latestRun, game)) {
        // If it is the current run, check if we loaded an earlier save - discard any milestones "from the future"
        return restoreToDay(latestRun, game.day);
    }
    else {
        // The game refreshes the page after a reset
        // Thus, if the latest run is the previous one, it can be comitted to history
        if (isPreviousRun(latestRun, game) && config.recordRuns) {
            history.commitRun(latestRun);
        }

        return makeNewRunStats(game);
    }
}

export function prepareCurrentRun(game: Game, config: ConfigManager, history: HistoryManager) {
    const run = reactive(prepareCurrentRunImpl(game, config, history));
    watch(run, () => saveCurrentRun(run), { deep: true });

    return run;
}
