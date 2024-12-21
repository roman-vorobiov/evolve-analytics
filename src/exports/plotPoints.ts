import { generateMilestoneNames } from "../milestones";
import { zip } from "../utils";
import type { HistoryManager, HistoryEntry } from "../history";
import type { ViewConfig } from "../config";
import type { LatestRun } from "../runTracking";

export type PlotPoint = {
    run: number,
    milestone: string,
    day: number,
    dayDiff?: number, // days since the last enabled non-event milestone
    segment: number, // days since the last non-event milestone
    raceName?: string,
    pending?: boolean
}

function makeMilestoneNamesMapping(history: HistoryManager, view: ViewConfig): Record<number, string> {
    const milestones = Object.keys(view.milestones);
    const milestoneIDs = milestones.map(m => history.getMilestoneID(m));
    const milestoneNames = generateMilestoneNames(milestones, view.universe);

    return Object.fromEntries(zip(milestoneIDs, milestoneNames));
}

class SegmentCounter {
    private previousDay = 0;
    private previousEnabledDay = 0;

    constructor(private view: ViewConfig) {}

    reset() {
        this.previousDay = 0;
        this.previousEnabledDay = 0;
    }

    next(milestone: string, day: number) {
        const dayDiff = day - this.previousEnabledDay;
        const segment = day - this.previousDay;

        const isEvent = milestone.startsWith("event:");
        const enabled = this.view.milestones[milestone];

        if (!isEvent) {
            this.previousDay = day;

            if (enabled) {
                this.previousEnabledDay = day;
            }
        }

        if (enabled) {
            return {
                dayDiff: isEvent ? undefined : dayDiff,
                segment: isEvent ? day : segment
            };
        }
    }
}

export function runAsPlotPoints(currentRun: LatestRun, view: ViewConfig, runIdx: number, orderedMilestones: string[]): PlotPoint[] {
    const milestoneNames = generateMilestoneNames(orderedMilestones, view.universe);

    const entries: PlotPoint[] = [];

    const counter = new SegmentCounter(view);

    let nextMilestoneIdx = 0;
    for (let i = 0; i !== orderedMilestones.length; ++i) {
        const milestone = orderedMilestones[i];
        const milestoneName = milestoneNames[i];

        const day = currentRun.milestones[milestone];
        if (day === undefined) {
            continue;
        }

        nextMilestoneIdx = i + 1;

        const info = counter.next(milestone, day);
        if (info === undefined) {
            continue;
        }

        entries.push({
            run: runIdx,
            raceName: currentRun.raceName,
            milestone: milestoneName,
            day,
            dayDiff: info.dayDiff,
            segment: info.segment
        });
    }

    // Guess what the next milestone is gonna be, default to the view's reset
    let milestone = `reset:${view.resetType}`;
    for (; nextMilestoneIdx !== orderedMilestones.length; ++nextMilestoneIdx) {
        const candidate = orderedMilestones[nextMilestoneIdx];
        if (!candidate.startsWith("event:") && view.milestones[candidate]) {
            milestone = candidate;
            break;
        }
    }

    const info = counter.next(milestone, currentRun.totalDays);
    if (info === undefined) {
        return entries;
    }

    entries.push({
        run: runIdx,
        raceName: currentRun.raceName,
        milestone: generateMilestoneNames([milestone], view.universe)[0],
        day: currentRun.totalDays,
        dayDiff: info.dayDiff,
        segment: info.segment,
        pending: true
    });

    return entries;
}

export function asPlotPoints(filteredRuns: HistoryEntry[], history: HistoryManager, view: ViewConfig): PlotPoint[] {
    const milestoneNames = makeMilestoneNamesMapping(history, view);

    const entries: PlotPoint[] = [];

    const counter = new SegmentCounter(view);

    for (let i = 0; i !== filteredRuns.length; ++i) {
        const run = filteredRuns[i];

        counter.reset();

        for (const [milestoneID, day] of run.milestones) {
            const milestone = history.getMilestone(milestoneID);
            const milestoneName = milestoneNames[milestoneID];

            if (!(milestone in view.milestones)) {
                continue;
            }

            const info = counter.next(milestone, day);
            if (info === undefined) {
                continue;
            }

            entries.push({
                run: i,
                raceName: run.raceName,
                milestone: milestoneName,
                day,
                dayDiff: info.dayDiff,
                segment: info.segment
            });
        }
    }

    return entries;
}
