import { saveHistory, loadHistory } from "./database";
import { inferResetType, type LatestRun } from "./runTracking";
import { shouldIncludeRun } from "./exports/historyFiltering";
import { Subscribable } from "./subscribable";
import { rotateMap } from "./utils"
import type { universes } from "./enums";
import type { Game } from "./game";
import type { ConfigManager } from "./config";

export type MilestoneReference = [number, number];

export type HistoryEntry = {
    run: number,
    universe: keyof typeof universes,
    milestones: MilestoneReference[],
    raceName?: string,
    combatDeaths?: number
}

export type RunHistory = {
    milestones: Record<string, number>,
    runs: HistoryEntry[]
}

export class HistoryManager extends Subscribable {
    private game: Game;
    private config: ConfigManager;
    private history: RunHistory;
    public milestones: Record<number, string>;

    constructor(game: Game, config: ConfigManager, history: RunHistory) {
        super();

        this.game = game;
        this.config = config;
        this.history = history;
        this.milestones = rotateMap(history.milestones);

        this.on("*", () => {
            saveHistory(this.history);
        });
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
            this.emit("updated", this);
        }
    }

    commitRun(runStats: LatestRun) {
        const resetType = inferResetType(runStats, this.game);

        const milestones: MilestoneReference[] = [
            ...Object.entries(runStats.milestones).map(([milestone, days]) => [this.getMilestoneID(milestone), days]) as MilestoneReference[],
            [this.getMilestoneID(`reset:${resetType}`), runStats.totalDays]
        ];

        milestones.sort(([, l], [, r]) => l - r);

        const entry: HistoryEntry = {
            run: runStats.run,
            universe: runStats.universe!,
            milestones
        };

        this.augmentEntry(entry, runStats);

        this.history.runs.push(entry);
        this.emit("updated", this);
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
