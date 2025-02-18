import { rotateMap, transformMap } from "../utils";
import type { additionalInformation, resets, universes, viewModes } from "../enums";
import type { RunHistory, HistoryEntry } from "../history";
import type { Config13, ViewConfig13 } from "./13";

export type ViewConfig12 = {
    resetType: keyof typeof resets,
    starLevel?: number,
    universe?: keyof typeof universes,
    mode: keyof typeof viewModes,
    includeCurrentRun?: boolean,
    smoothness: number,
    showBars: boolean,
    showLines: boolean,
    fillArea: boolean,
    numRuns?: number,
    daysScale?: number,
    milestones: Record<string, boolean>,
    additionalInfo: Array<keyof typeof additionalInformation>
}

export type Config12 = {
    version: number,
    recordRuns: boolean,
    lastOpenViewIndex?: number,
    views: ViewConfig12[]
}

export function getResetType(entry: HistoryEntry, milestonesByID: Record<number, string>) {
    const [milestoneID] = entry.milestones[entry.milestones.length - 1];
    const milestone = milestonesByID[milestoneID];

    const prefix = "reset:";
    if (milestone.startsWith(prefix)) {
        return milestone.slice(prefix.length);
    }
}

function shouldIncludeRun(entry: HistoryEntry, view: ViewConfig13, milestonesByID: Record<number, string>) {
    if (view.universe !== undefined && entry.universe !== view.universe) {
        return false;
    }

    if (view.starLevel !== undefined && entry.starLevel !== view.starLevel) {
        return false;
    }

    if (getResetType(entry, milestonesByID) !== view.resetType) {
        return false;
    }

    // Don't show VC runs in generic Black Hole views
    if (view.resetType === "blackhole" && view.universe === undefined) {
        return entry.universe !== "magic";
    }

    return true;
}

function getLastRun(history: RunHistory, view: ViewConfig13): HistoryEntry | undefined {
    const milestonesByID = rotateMap(history.milestones);

    for (let i = history.runs.length - 1; i >= 0; --i) {
        const run = history.runs[i];
        if (shouldIncludeRun(run, view, milestonesByID)) {
            return run;
        }
    }
}

function sortMilestones(view: ViewConfig13, lastRun: HistoryEntry, history: RunHistory) {
    const milestones = Object.keys(view.milestones);

    function isEffectMilestone(milestone: string) {
        return milestone.startsWith("effect:");
    }

    milestones.sort((l, r) => {
        if (!isEffectMilestone(l) && !isEffectMilestone(r)) {
            const lIdx = lastRun.milestones.findIndex(([id]) => id === history.milestones[l]);
            const rIdx = lastRun.milestones.findIndex(([id]) => id === history.milestones[r]);
            return rIdx - lIdx;
        }
        else if (isEffectMilestone(l)) {
            return 1;
        }
        else {
            return -1;
        }
    });

    for (let i = 0; i != milestones.length; ++i) {
        const milestone = milestones[i];
        view.milestones[milestone].index = i;
    }
}

function migrateView(view: ViewConfig12, history: RunHistory): ViewConfig13 {
    const newView: ViewConfig13 = {
        ...view,
        milestones: transformMap(view.milestones, ([milestone, enabled], index) => [milestone, { index, enabled }])
    };

    const lastRun = getLastRun(history, newView);
    if (lastRun !== undefined) {
        sortMilestones(newView, lastRun, history);
    }

    return newView;
}

export function migrate12(config: Config13, history: RunHistory) {
    config.views = config.views.map(v => migrateView(v as any, history));

    config.version = 13;
}
