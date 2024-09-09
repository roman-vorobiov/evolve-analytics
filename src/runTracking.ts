import { getRunNumber, getDay, getUniverse, getResetCounts, onGameDay } from "./gameUtils";
import { saveLastRun, loadLastRun, discardLastRun } from "./runStats";
import { config } from "./config";
import { history } from "./history";

import type { RunStats } from "./runStats";

export function updateHistory() {
    const lastRunStats = loadLastRun();

    if (lastRunStats !== null) {
        // We want to keep it if we just refreshed the page
        if (lastRunStats.run !== getRunNumber() || lastRunStats.totalDays > getDay()) {
            discardLastRun();
        }

        // We want to push the run into the history only immediately after finishing it
        if (lastRunStats.run === getRunNumber() - 1) {
            history.commitRun(lastRunStats);
        }
    }
}

function checkMilestoneConditions(runStats: RunStats) {
    const newlyCompleted = [];

    for (const milestone of config.milestones) {
        // Don't check completed milestones
        if (milestone.name in runStats.milestones) {
            continue;
        }

        if (milestone.complete) {
            newlyCompleted.push(milestone.name);
        }
    }

    return newlyCompleted;
}

function makeNewRunStats(): RunStats {
    return {
        run: getRunNumber(),
        universe: getUniverse(),
        resets: getResetCounts(),
        totalDays: 0,
        milestones: {}
    };
}

export function trackMilestones() {
    const currentRunStats = loadLastRun() ?? makeNewRunStats();

    onGameDay(day => {
        currentRunStats.totalDays = day;

        const newlyCompleted = checkMilestoneConditions(currentRunStats);
        for (const milestone of newlyCompleted) {
            // Since this callback is invoked at the beginning of a day,
            // the milestone was reached the previous day
            currentRunStats.milestones[milestone] = day - 1;
        }

        saveLastRun(currentRunStats);
    });
}
