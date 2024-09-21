import { saveCurrentRun, loadLatestRun, discardLatestRun } from "./database";
import { makeMilestoneChecker, type MilestoneChecker } from "./milestones";
import type { resets, universes } from "./enums";
import type { Game } from "./game";
import type { ConfigManager } from "./config";
import type { HistoryManager } from "./history";

export type LatestRun = {
    run: number,
    universe: keyof typeof universes,
    resets: Partial<Record<keyof typeof resets, number>>,
    totalDays: number,
    milestones: Record<string, number>
}

export function inferResetType(runStats: LatestRun, game: Game) {
    const resetCounts = game.resetCounts;

    // Find which reset got incremented
    const reset = Object.keys(resetCounts).find((reset: keyof typeof resets) => {
        return resetCounts[reset] === (runStats.resets[reset] ?? 0) + 1;
    });

    return reset ?? "unknown";
}

export function isCurrentRun(runStats: LatestRun, game: Game) {
    return runStats.run === game.runNumber && runStats.totalDays <= game.day;
}

export function isPreviousRun(runStats: LatestRun, game: Game) {
    return runStats.run === game.runNumber - 1;
}

export function processLatestRun(game: Game, config: ConfigManager, history: HistoryManager) {
    const latestRun = loadLatestRun();

    if (latestRun === null) {
        return;
    }

    // Don't commit the last run if history is paused
    if (!config.recordRuns) {
        discardLatestRun();
        return;
    }

    // If it's not the current run, discard it so that we can start tracking from scratch
    if (!isCurrentRun(latestRun, game)) {
        discardLatestRun();
    }

    // The game refreshes the page after a reset
    // Thus, if the latest run is the previous one, it can be comitted to history
    if (isPreviousRun(latestRun, game)) {
        history.commitRun(latestRun);
    }
}

function makeNewRunStats(game: Game): LatestRun {
    return {
        run: game.runNumber,
        universe: game.universe,
        resets: game.resetCounts,
        totalDays: 0,
        milestones: {}
    };
}

function checkMilestoneConditions(checkers: MilestoneChecker[], runStats: LatestRun) {
    const newlyCompleted = [];

    for (const { milestone, reached} of checkers) {
        // Don't check completed milestones
        if (milestone in runStats.milestones) {
            continue;
        }

        if (reached()) {
            newlyCompleted.push(milestone);
        }
    }

    return newlyCompleted;
}

export function trackMilestones(game: Game, config: ConfigManager) {
    const currentRunStats = loadLatestRun() ?? makeNewRunStats(game);

    let checkers = config.milestones.map(m => makeMilestoneChecker(game, m)!);
    config.on("*", () => {
        checkers = config.milestones.map(m => makeMilestoneChecker(game, m)!);
    });

    game.onGameDay(day => {
        if (!config.recordRuns) {
            return;
        }

        currentRunStats.totalDays = day;

        const newlyCompleted = checkMilestoneConditions(checkers, currentRunStats);
        for (const milestone of newlyCompleted) {
            // Since this callback is invoked at the beginning of a day,
            // the milestone was reached the previous day
            currentRunStats.milestones[milestone] = day - 1;
        }

        saveCurrentRun(currentRunStats);
    });
}
