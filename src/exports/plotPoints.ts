import { generateMilestoneNames } from "../milestones";
import { transformMap, zip } from "../utils";
import type { HistoryManager, HistoryEntry, MilestoneReference } from "../history";
import type { ViewConfig } from "../config";

export type PlotPoint = {
    run: number,
    milestone: string,
    day: number,
    dayDiff?: number, // days since the last enabled non-event milestone
    segment: number, // days since the last non-event milestone
    raceName?: string
}

function makeMilestoneNamesMapping(history: HistoryManager, view: ViewConfig): Record<number, string> {
    const milestones = Object.keys(view.milestones);
    const milestoneIDs = milestones.map(m => history.getMilestoneID(m));
    const milestoneNames = generateMilestoneNames(milestones, view.universe);

    return Object.fromEntries(zip(milestoneIDs, milestoneNames));
}

export function asPlotPoints(filteredRuns: HistoryEntry[], history: HistoryManager, view: ViewConfig): PlotPoint[] {
    const milestones = transformMap(view.milestones, ([milestone, enabled]) => {
        return [history.getMilestoneID(milestone), { enabled, isEvent: milestone.startsWith("event:") }];
    });

    const milestoneNames = makeMilestoneNamesMapping(history, view);

    const entries: PlotPoint[] = [];

    for (let i = 0; i !== filteredRuns.length; ++i) {
        const run = filteredRuns[i];

        // Events have their separate segmentation logic
        const events: MilestoneReference[] = [];
        const nonEvents: MilestoneReference[] = [];

        for (const [milestoneID, day] of run.milestones) {
            if (!(milestoneID in milestones)) {
                continue;
            }

            if (milestones[milestoneID].isEvent) {
                events.push([milestoneID, day]);
            }
            else {
                nonEvents.push([milestoneID, day]);
            }
        }

        for (const [milestoneID, day] of events) {
            if (!milestones[milestoneID].enabled) {
                continue;
            }

            entries.push({
                run: i,
                raceName: run.raceName,
                milestone: milestoneNames[milestoneID],
                day,
                segment: day
            });
        }

        let previousDay = 0;
        let previousEnabledDay = 0;

        for (const [milestoneID, day] of nonEvents) {
            const dayDiff = day - previousEnabledDay;
            const segment = day - previousDay;

            previousDay = day;

            if (!milestones[milestoneID].enabled) {
                continue;
            }

            previousEnabledDay = day;

            entries.push({
                run: i,
                raceName: run.raceName,
                milestone: milestoneNames[milestoneID],
                day,
                dayDiff,
                segment
            });
        }
    }

    return entries;
}
