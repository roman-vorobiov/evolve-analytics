import { inferResetType, type RunStats } from "./runStats";
import { rotateMap } from "./utils";

type MilestoneTimestamp = [number, number];

export type HistoryEntry = {
    run: number,
    universe: string,
    milestones: MilestoneTimestamp[]
}

type HistoryState = {
    milestones?: Record<string, number>,
    runs?: HistoryEntry[]
}

const historyStorageKey = "sneed.analytics.history";

function loadHistory(): HistoryState {
    return JSON.parse(localStorage.getItem(historyStorageKey));
}

function saveHistory(history: HistoryState) {
    localStorage.setItem(historyStorageKey, JSON.stringify(history));
}

export class History {
    milestones: Record<number, string>;
    milestoneIDs: Record<string, number>;
    runs: HistoryEntry[];

    constructor(state: HistoryState | undefined) {
        this.milestoneIDs = state?.milestones ?? {};
        this.milestones = rotateMap(this.milestoneIDs);
        this.runs = state?.runs ?? [];
    }

    commitRun(runStats: RunStats) {
        const resetType = inferResetType(runStats);

        const milestones: MilestoneTimestamp[] = [
            ...Object.entries(runStats.milestones).map(([milestone, days]) => [this.getMilestoneID(milestone), days]) as MilestoneTimestamp[],
            [this.getMilestoneID(resetType), runStats.totalDays]
        ];

        this.runs.push({
            run: runStats.run,
            universe: runStats.universe,
            milestones
        });

        saveHistory({
            milestones: this.milestoneIDs,
            runs: this.runs
        });
    }

    getMilestone(id: number): string {
        return this.milestones[id];
    }

    getMilestoneID(milestone: string): number {
        return this.milestoneIDs[milestone] ?? this.addMilestone(milestone);
    }

    addMilestone(milestone: string): number {
        const milestoneIDs = Object.values(this.milestoneIDs);
        const id = milestoneIDs.length !== 0 ? Math.max(...milestoneIDs) + 1 : 0;

        this.milestones[id] = milestone;
        this.milestoneIDs[milestone] = id;

        return id;
    }
}

export const history = new History(loadHistory());
