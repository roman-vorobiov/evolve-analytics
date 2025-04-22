import { makeMilestoneChecker, milestoneType, withEventConditions } from "./milestones";
import type { Game } from "./game";
import type { ConfigManager } from "./config";
import type { MilestoneChecker } from "./milestones";
import type { LatestRun } from "./pendingRun";

import Vue from "vue";

function updateMilestones(runStats: LatestRun, checkers: MilestoneChecker[]) {
    for (const { milestone, reached } of checkers) {
        // Don't check completed milestones
        if (milestone in runStats.milestones) {
            continue;
        }

        if (milestoneType(milestone) === "effect") {
            const isActive = reached();
            const startDay = runStats.activeEffects[milestone];

            if (isActive && startDay === undefined) {
                Vue.set(runStats.activeEffects, milestone, runStats.totalDays);
            }
            else if (!isActive && startDay !== undefined) {
                runStats.effectsHistory.push([milestone, startDay, runStats.totalDays - 1]);
                Vue.delete(runStats.activeEffects, milestone);
            }
        }
        else if (reached()) {
            // Since this callback is invoked at the beginning of a day,
            // the milestone was reached the previous day
            Vue.set(runStats.milestones, milestone, Math.max(0, runStats.totalDays - 1));
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
    Vue.set(runStats, "starLevel", game.starLevel);
    Vue.set(runStats, "universe", game.universe);
    Vue.set(runStats, "raceName", game.raceName);
    Vue.set(runStats, "junkTraits", junkTraits(game));
    Vue.set(runStats, "combatDeaths", game.combatDeaths);
}

export function collectMilestones(config: ConfigManager) {
    const uniqueMilestones = new Set(config.views.flatMap(v => {
        return Object.entries(v.milestones)
            .filter(([milestone]) => !milestone.startsWith("reset:"))
            .map(([milestone]) => milestone);
    }));

    return Array.from(uniqueMilestones);
}

function makeMilestoneCheckers(game: Game, config: ConfigManager) {
    const milestones = collectMilestones(config);
    return withEventConditions(milestones).map(m => makeMilestoneChecker(game, m)!);
}

export function trackMilestones(currentRun: LatestRun, game: Game, config: ConfigManager) {
    let checkers: MilestoneChecker[] = [];
    config.watch(() => { checkers = makeMilestoneCheckers(game, config) }, true /*immediate*/);

    game.onGameDay(day => {
        if (!config.recordRuns) {
            return;
        }

        currentRun.totalDays = day;

        updateAdditionalInfo(currentRun, game);

        updateMilestones(currentRun, checkers);
    });
}
