import { saveHistory, loadHistory } from "./database";
import { inferResetType, type LatestRun } from "./pendingRun";
import { shouldIncludeRun } from "./exports/historyFiltering";
import { rotateMap } from "./utils"
import type { universes } from "./enums";
import type { Game } from "./game";
import type { ConfigManager, View } from "./config";

import { ref, watch, type Ref } from "vue";

export type MilestoneReference = [number, number];
export type EffectReference = [number, number, number];

export type HistoryEntry = {
    run: number,
    starLevel?: number,
    universe: keyof typeof universes,
    milestones: MilestoneReference[],
    effects?: EffectReference[],
    raceName?: string,
    combatDeaths?: number,
    junkTraits?: Record<string, number>
}

export type RunHistory = {
    milestones: Record<string, number>,
    runs: HistoryEntry[]
}

export class HistoryManager {
    public milestones: Record<number, string>;
    private length: Ref<number>;

    constructor(private game: Game, private config: ConfigManager, private history: RunHistory) {
        this.length = ref(history.runs.length);
        this.watch(() => saveHistory(history));

        this.milestones = rotateMap(history.milestones);
    }

    watch(callback: () => void) {
        watch(this.length, callback);
    }

    get milestoneIDs() {
        return this.history.milestones;
    }

    get runs() {
        return this.history.runs;
    }

    discardRun(run: HistoryEntry) {
        const idx = this.runs.indexOf(run);
        if (idx !== -1) {
            this.history.runs.splice(idx, 1);
            this.length.value = this.runs.length;
        }
    }

    commitRun(runStats: LatestRun) {
        const resetType = inferResetType(runStats, this.game);

        const entry: HistoryEntry = {
            run: runStats.run,
            universe: runStats.universe!,
            starLevel: runStats.starLevel,
            milestones: [
                [this.getMilestoneID(`reset:${resetType}`), runStats.totalDays]
            ]
        };

        const matchingViews = this.config.views.filter(v => shouldIncludeRun(entry, v, this));

        this.collectMilestones(entry, runStats, matchingViews);
        this.collectEffects(entry, runStats, matchingViews);
        this.collectAdditionalInfo(entry, runStats, matchingViews);

        this.history.runs.push(entry);
        this.length.value = this.runs.length;
    }

    getMilestone(id: number): string {
        return this.milestones[id];
    }

    getMilestoneID(milestone: string): number {
        return this.milestoneIDs[milestone] ?? this.addMilestone(milestone);
    }

    private addMilestone(milestone: string): number {
        const milestoneIDs = Object.values(this.milestoneIDs);
        const id = milestoneIDs.length !== 0 ? Math.max(...milestoneIDs) + 1 : 0;

        this.milestones[id] = milestone;
        this.milestoneIDs[milestone] = id;

        return id;
    }

    private collectMilestones(entry: HistoryEntry, runStats: LatestRun, views: View[]) {
        const milestonesFilter = new Set(views.flatMap(v => Object.keys(v.milestones)));

        entry.milestones.push(
            ...Object.entries(runStats.milestones)
                .filter(([milestone]) => milestonesFilter.has(milestone))
                .map(([milestone, days]) => [this.getMilestoneID(milestone), days]) as MilestoneReference[]
        );

        entry.milestones.sort(([, l], [, r]) => l - r);
    }

    private collectEffects(entry: HistoryEntry, runStats: LatestRun, views: View[]) {
        const milestonesFilter = new Set(views.flatMap(v => Object.keys(v.milestones)));

        let effectsHistory = [
            ...runStats.effectsHistory,
            ...Object.entries(runStats.activeEffects)
                .map(([effect, start]) => [effect, start, runStats.totalDays]) as LatestRun["effectsHistory"]
        ];

        effectsHistory = effectsHistory.filter(([effect]) => milestonesFilter.has(effect));

        if (effectsHistory.length !== 0) {
            entry.effects = effectsHistory.map(([effect, start, end]) => [this.getMilestoneID(effect), start, end]);
        }
    }

    private collectAdditionalInfo(entry: HistoryEntry, runStats: LatestRun, views: View[]) {
        const infoKeys = new Set(views.flatMap(v => v.additionalInfo));

        for (const key of infoKeys.values()) {
            entry[key] = runStats[key] as any;
        }
    }
}

export function blankHistory(): RunHistory {
    return {
        milestones: {},
        runs: []
    }
}

export function initializeHistory(game: Game, config: ConfigManager): HistoryManager {
    const history = loadHistory() ?? blankHistory();

    return new HistoryManager(game, config, history);
}
