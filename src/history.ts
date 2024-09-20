import { saveHistory, loadHistory } from "./database";
import { inferResetType, type LatestRun } from "./runTracking";
import { rotateMap } from "./utils"
import type { Game } from "./game";

export type MilestoneReference = [number, number];

export type HistoryEntry = {
    run: number,
    universe: string,
    milestones: MilestoneReference[]
}

export type RunHistory = {
    milestones: Record<string, number>,
    runs: HistoryEntry[]
}

export class HistoryManager {
    private game: Game;
    private history: RunHistory;
    public milestones: Record<number, string>;

    constructor(game: Game, history: RunHistory) {
        this.game = game;
        this.history = history;
        this.milestones = rotateMap(history.milestones);
    }

    get milestoneIDs() {
        return this.history.milestones;
    }

    get runs() {
        return this.history.runs;
    }

    commitRun(runStats: LatestRun) {
        const resetType = inferResetType(runStats, this.game);

        const milestones: MilestoneReference[] = [
            ...Object.entries(runStats.milestones).map(([milestone, days]) => [this.getMilestoneID(milestone), days]) as MilestoneReference[],
            [this.getMilestoneID(`reset:${resetType}`), runStats.totalDays]
        ];

        this.history.runs.push({
            run: runStats.run,
            universe: runStats.universe,
            milestones
        });

        saveHistory(this.history);
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
}

export function blankHistory(): RunHistory {
    return {
        milestones: {},
        runs: []
    }
}

export function initializeHistory(game: Game): HistoryManager {
    const history = loadHistory() ?? blankHistory();

    return new HistoryManager(game, history);
}
