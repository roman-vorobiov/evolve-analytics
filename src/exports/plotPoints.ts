import { milestoneType, milestoneName, milestoneEnabled, type Milestone } from "../milestones";
import type { HistoryManager, HistoryEntry, MilestoneReference } from "../history";
import type { ViewConfig } from "../config";

export type PlotPoint = {
    run: number,
    milestone: string,
    day: number,
    dayDiff?: number, // days since the last enabled non-event milestone
    segment: number // days since the last non-event milestone
}

export function asPlotPoints(filteredRuns: HistoryEntry[], history: HistoryManager, view: ViewConfig): PlotPoint[] {
    const getMilestoneID = (milestone: Milestone) => history.getMilestoneID(milestoneName(milestone));
    const getMilestoneInfo = (milestone: Milestone) => ({ type: milestoneType(milestone), enabled: milestoneEnabled(milestone) });

    const milestones = Object.fromEntries(view.milestones.map(m => [getMilestoneID(m), getMilestoneInfo(m)]));

    const entries: PlotPoint[] = [];

    for (let i = 0; i !== filteredRuns.length; ++i) {
        // Events have their separate segmentation logic
        const events: MilestoneReference[] = [];
        const nonEvents: MilestoneReference[] = [];

        for (const [milestoneID, day] of filteredRuns[i].milestones) {
            if (!(milestoneID in milestones)) {
                continue;
            }

            if (milestones[milestoneID].type === "Event") {
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
                milestone: history.getMilestone(milestoneID),
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
                milestone: history.getMilestone(milestoneID),
                day,
                dayDiff,
                segment
            });
        }
    }

    return entries;
}
