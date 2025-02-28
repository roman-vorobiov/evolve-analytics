import { saveHistory, loadHistory } from "./database";
import { inferResetType, type LatestRun } from "./pendingRun";
import { shouldIncludeRun } from "./exports/historyFiltering";
import { rotateMap } from "./utils"
import type { universes } from "./enums";
import type { Game } from "./game";
import type { ConfigManager } from "./config";

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

        const milestones: MilestoneReference[] = [
            ...Object.entries(runStats.milestones).map(([milestone, days]) => [this.getMilestoneID(milestone), days]) as MilestoneReference[],
            [this.getMilestoneID(`reset:${resetType}`), runStats.totalDays]
        ];

        milestones.sort(([, l], [, r]) => l - r);

        const effectsHistory = [
            ...runStats.effectsHistory,
            ...Object.entries(runStats.activeEffects).map(([effect, start]) => [effect, start, runStats.totalDays]) as [string, number, number][]
        ];

        const effects = effectsHistory
            .map(([effect, start, end]) => [this.getMilestoneID(effect), start, end]) as EffectReference[];

        const entry: HistoryEntry = {
            run: runStats.run,
            universe: runStats.universe!,
            starLevel: runStats.starLevel,
            milestones,
            effects: effects.length === 0 ? undefined : effects
        };

        this.augmentEntry(entry, runStats);

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

    private augmentEntry(entry: HistoryEntry, runStats: LatestRun) {
        const views = this.config.views.filter(v => shouldIncludeRun(entry, v, this));
        const infoKeys = [...new Set(views.flatMap(v => v.additionalInfo))];

        for (const key of infoKeys) {
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
