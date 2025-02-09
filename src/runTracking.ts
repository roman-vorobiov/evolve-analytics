import { saveCurrentRun, loadLatestRun, discardLatestRun } from "./database";
import { isEffectMilestone, makeMilestoneChecker, type MilestoneChecker } from "./milestones";
import eventsInfo from "./events";
import { patternMatcher, filterMap } from "./utils";
import type { resets, universes } from "./enums";
import type { Game } from "./game";
import type { ConfigManager } from "./config";
import type { HistoryManager } from "./history";

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

export function restoreToDay(run: LatestRun, day: number) {
    run.milestones = filterMap(run.milestones, ([, timestamp]) => timestamp <= day);
    run.totalDays = day;
}

export function processLatestRun(game: Game, config: ConfigManager, history: HistoryManager) {
    const latestRun = loadLatestRun();

    if (latestRun === null) {
        return;
    }

    if (isCurrentRun(latestRun, game)) {
        // If it is the current run, check if we loaded an earlier save - discard any milestones "from the future"
        restoreToDay(latestRun, game.day);
        saveCurrentRun(latestRun);
    }
    else {
        // If it's not the current run, discard it so that we can start tracking from scratch
        discardLatestRun();

        // The game refreshes the page after a reset
        // Thus, if the latest run is the previous one, it can be comitted to history
        if (isPreviousRun(latestRun, game) && config.recordRuns) {
            history.commitRun(latestRun);
        }
    }
}

function makeNewRunStats(game: Game): LatestRun {
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

function updateMilestones(runStats: LatestRun, checkers: MilestoneChecker[]) {
    for (const { milestone, reached } of checkers) {
        // Don't check completed milestones
        if (milestone in runStats.milestones) {
            continue;
        }

        if (isEffectMilestone(milestone)) {
            const isActive = reached();
            const startDay = runStats.activeEffects[milestone];

            if (isActive && startDay === undefined) {
                runStats.activeEffects[milestone] = runStats.totalDays;
            }
            else if (!isActive && startDay !== undefined) {
                runStats.effectsHistory.push([milestone, startDay, runStats.totalDays - 1]);
                delete runStats.activeEffects[milestone];
            }
        }
        else if (reached()) {
            // Since this callback is invoked at the beginning of a day,
            // the milestone was reached the previous day
            runStats.milestones[milestone] = runStats.totalDays - 1;
        }
    }
}

function junkTraits(game: Game) {
    if (!game.finishedEvolution) {
        return undefined;
    }

    const hasJunkGene = game.hasChallengeGene("no_crispr");
    const hasBadGenes = game.hasChallengeGene("badgenes");

    if (!hasJunkGene && !hasBadGenes) {
        return {};
    }

    // All negative major traits that have different rank from this race's base number
    let traits = game.majorTraits
        .filter(t => game.traitValue(t) < 0)
        .filter(t => game.currentTraitRank(t) !== game.baseTraitRank(t));

    // The imitated negative trait is included - keep it only if it got upgraded
    if (traits.length > (hasBadGenes ? 3 : 1)) {
        traits = traits.filter(t => !game.imitatedTraits.includes(t));
    }

    return Object.fromEntries(traits.map(t => [t, game.currentTraitRank(t)]));
}

function updateAdditionalInfo(runStats: LatestRun, game: Game) {
    runStats.starLevel ??= game.starLevel;
    runStats.universe ??= game.universe;
    runStats.raceName ??= game.raceName;
    runStats.junkTraits ??= junkTraits(game);
    runStats.combatDeaths = game.combatDeaths;
}

function withEventConditions(milestones: string[]): string[] {
    const hasPrecondition = (event: string) => eventsInfo[event as keyof typeof eventsInfo].conditionMet !== undefined;

    const conditions = milestones
        .map(patternMatcher([[/event:(.+)/, (id) => hasPrecondition(id) ? `event_condition:${id}` : undefined]]))
        .filter(m => m !== undefined);

    return [...conditions, ...milestones];
}

function makeMilestoneCheckers(game: Game, config: ConfigManager) {
    return withEventConditions(config.milestones).map(m => makeMilestoneChecker(game, m)!);
}

export function trackMilestones(game: Game, config: ConfigManager) {
    const currentRunStats = loadLatestRun() ?? makeNewRunStats(game);

    let checkers = makeMilestoneCheckers(game, config);
    config.on("*", () => {
        checkers = makeMilestoneCheckers(game, config);
    });

    game.onGameDay(day => {
        if (!config.recordRuns) {
            return;
        }

        currentRunStats.totalDays = day;

        updateAdditionalInfo(currentRunStats, game);

        updateMilestones(currentRunStats, checkers);

        saveCurrentRun(currentRunStats);
    });

    return currentRunStats;
}
