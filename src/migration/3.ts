import { buildings, resets, techs, universes } from "../enums";
import { milestoneName } from "../milestones";
import { rotateMap, transformMap, lazyLoad } from "../utils";
import { viewModes7 as viewModes4 } from "./7";
import type { HistoryEntry, RunHistory } from "../history";
import type { Config4 } from "./4";
import type { LatestRun6 as LatestRun4 } from "./6";

type BuiltMilestone = ["Built", /*tab*/ string, /*id*/ string, /*name*/ string, /*count*/ number];
type ResearchedMilestone = ["Researched", /*id*/ string, /*name*/ string];
type EventMilestone = ["Event", /*name*/ string];
type ResetMilestone = ["Reset", /*name*/ string];

type Milestone = [...(BuiltMilestone | ResearchedMilestone | EventMilestone | ResetMilestone), /*enabled*/ boolean];

type ViewConfig3 = {
    resetType: string,
    universe?: keyof typeof universes,
    mode: string,
    daysScale?: number,
    numRuns?: number,
    milestones: Milestone[]
}

export type Config3 = {
    version: number,
    views: ViewConfig3[]
}

export function migrateConfig(config: Config3): Config4 {
    const resetIDs = rotateMap(resets);
    const viewModeIDs = rotateMap(viewModes4);

    function convertReset(resetName: string) {
        return resetName === "Vacuum Collapse" ? "blackhole" : resetIDs[resetName];
    }

    return {
        version: 4,
        views: config.views.map((view): Config4["views"][0] => {
            return {
                resetType: convertReset(view.resetType),
                universe: view.universe,
                mode: viewModeIDs[view.mode],
                daysScale: view.daysScale,
                numRuns: view.numRuns,
                milestones: Object.fromEntries(view.milestones.map((milestone): [string, boolean] => {
                    if (milestone[0] === "Built") {
                        const [, tab, id, , count, enabled] = milestone;
                        return [`built:${tab}-${id}:${count}`, enabled];
                    }
                    else if (milestone[0] === "Researched") {
                        const [, id, , enabled] = milestone;
                        return [`tech:${id}`, enabled];
                    }
                    else if (milestone[0] === "Event") {
                        const [, , enabled] = milestone;
                        return [`event:womlings`, enabled];
                    }
                    else if (milestone[0] === "Reset") {
                        const [, resetName, enabled] = milestone;
                        return [`reset:${convertReset(resetName)}`, enabled];
                    }

                    return ["unknown", true];
                }))
            };
        })
    };
}

export function migrateHistory(history: RunHistory, config: Config4): RunHistory {
    const oldNames = rotateMap(history.milestones);
    const newNames = Object.fromEntries(config.views.flatMap(v => Object.keys(v.milestones).map(m => [m, milestoneName(m)[0]])));

    function resetName(run: HistoryEntry) {
        const [milestoneID] = run.milestones[run.milestones.length - 1];
        return oldNames[milestoneID];
    }

    const numMilestones = Object.entries(history.milestones).length;

    // Old milestone ID to new milestones (with run numbers)
    const milestonesMapping: Record<number, Record<string, number[]>> = transformMap(history.milestones, ([, milestoneID]) => [milestoneID, {}]);
    for (let runIdx = 0; runIdx != history.runs.length; ++runIdx) {
        const run = history.runs[runIdx];

        for (const view of config.views) {
            if (resetName(run) !== resets[view.resetType]) {
                continue;
            }

            if (view.universe !== undefined && run.universe !== view.universe) {
                continue;
            }

            for (const [milestoneID] of run.milestones) {
                const map = milestonesMapping[milestoneID];

                for (const milestone of Object.keys(view.milestones)) {
                    if (oldNames[milestoneID] === newNames[milestone]) {
                        (map[milestone] ??= []).push(runIdx);
                    }
                }
            }
        }
    }

    let id = numMilestones;

    const resetIDs = lazyLoad(() => rotateMap(resets));
    const buildingIDs = lazyLoad(() => rotateMap(buildings));
    const researchIDs = lazyLoad(() => rotateMap(techs));

    const runsToRemap: Record<number, Record<number, number>> = {};
    const milestones: Record<string, number> = {};
    for (const [oldMilestoneID, candidatesMap] of Object.entries(milestonesMapping)) {
        const candidates = Object.entries(candidatesMap);

        if (candidates.length === 0) {
            // The old milestone is not present in any of the current views - guess
            const oldName = oldNames[Number(oldMilestoneID)];
            if (oldName === "Womlings arrival") {
                milestones["event:womlings"] = Number(oldMilestoneID);
            }
            else if (resetIDs[oldName] !== undefined) {
                milestones[`reset:${resetIDs[oldName]}`] = Number(oldMilestoneID);
            }
            else if (buildingIDs[oldName] !== undefined) {
                milestones[`built:${buildingIDs[oldName]}:1`] = Number(oldMilestoneID);
            }
            else if (researchIDs[oldName] !== undefined) {
                milestones[`tech:${researchIDs[oldName]}`] = Number(oldMilestoneID);
            }
        }
        else if (candidates.length === 1) {
            // The old milestone maps to exactly 1 new milestone - no remapping needed
            const [milestone] = candidates[0];
            milestones[milestone] = Number(oldMilestoneID);
        }
        else {
            // The old milestone maps to more than 1 new milestones - remap affected runs
            for (const [milestone, runs] of candidates) {
                const newMilestoneID = id++;
                milestones[milestone] = newMilestoneID;
                for (const run of runs) {
                    (runsToRemap[run] ??= {})[Number(oldMilestoneID)] = newMilestoneID;
                }
            }
        }
    }

    for (const [runIdx, mapping] of Object.entries(runsToRemap)) {
        const run = history.runs[Number(runIdx)];

        for (const reference of run.milestones) {
            reference[0] = mapping[reference[0]] ?? reference[0];
        }
    }

    return {
        milestones,
        runs: history.runs
    };
}

export type LatestRun3 = {
    run: number,
    universe: keyof typeof universes | "bigbang",
    resets: Record<string, number>,
    totalDays: number,
    milestones: Record<string, number>
}

export function migrateLatestRun(latestRun: LatestRun3, config: Config4, history: RunHistory): LatestRun4 | null {
    const resetIDs = rotateMap(resets);

    const newRun: LatestRun4 = {
        run: latestRun.run,
        universe: latestRun.universe,
        resets: transformMap(latestRun.resets, ([name, count]) => [resetIDs[name], count]),
        totalDays: latestRun.totalDays,
        milestones: {}
    };

    if (Object.entries(latestRun.milestones).length === 0) {
        return newRun;
    }

    const lastRecordedRun = history.runs[history.runs.length - 1];
    if (lastRecordedRun === undefined) {
        return null;
    }

    const milestones = rotateMap(history.milestones);
    const lastRecordedRunResetMilestoneID = lastRecordedRun.milestones[lastRecordedRun.milestones.length - 1][0];
    const lastRecordedRunResetMilestone = milestones[lastRecordedRunResetMilestoneID];
    const lastRecordedRunReset = lastRecordedRunResetMilestone.slice(6); // strip away the leading "reset:"

    // Find the views that match the latest run
    const views = config.views.filter(view => {
        if (view.resetType !== lastRecordedRunReset) {
            return false;
        }

        if (view.universe !== undefined && view.universe !== lastRecordedRun.universe) {
            return false;
        }

        return true;
    });

    if (views.length === 0) {
        return null;
    }

    const milestonesByName = Object.fromEntries(views.flatMap(v => Object.keys(v.milestones).map(m => [milestoneName(m)[0], m])));

    newRun.milestones = transformMap(latestRun.milestones, ([milestoneName, day]) => {
        const milestone = milestonesByName[milestoneName];
        if (milestone !== undefined) {
            return [milestone, day];
        }
        else {
            return ["", day];
        }
    });

    if ("" in newRun.milestones) {
        return null;
    }

    return newRun;
}

export function migrate3(config: Config3, history: RunHistory | null, latestRun: LatestRun3 | null): [Config4, RunHistory | null, LatestRun4 | null] {
    const newConfig = migrateConfig(config);

    let newHistory: RunHistory | null = null;
    if (history !== null) {
        newHistory = migrateHistory(history, newConfig);
    }

    let newLatestRun: LatestRun3 | null = null;
    if (latestRun !== null && newHistory !== null) {
        newLatestRun = migrateLatestRun(latestRun, newConfig, newHistory);
    }

    return [newConfig, newHistory, newLatestRun];
}
