import { generateMilestoneNames, isEventMilestone } from "../milestones";
import { zip, rotateMap } from "../utils";
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
    pending?: boolean,
    future?: boolean,
    overtime?: boolean
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

        const isEvent = isEventMilestone(milestone);
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

export function runAsPlotPoints(
    currentRun: LatestRun,
    view: ViewConfig,
    bestRun: PlotPoint[] | undefined,
    estimateFutureMilestones: boolean,
    runIdx: number
): PlotPoint[] {
    const onlyRun = bestRun === undefined || bestRun.length === 0;

    const milestones = Object.keys(view.milestones);
    const milestoneNames = generateMilestoneNames(milestones, view.universe);
    const milestoneNameMap = Object.fromEntries(zip(milestones, milestoneNames)) as Record<string, string>;

    const bestRunTimes = onlyRun ? {} : Object.fromEntries(bestRun.map(entry => [entry.milestone, entry.day]));
    let offset = 0;

    const entries: PlotPoint[] = [];
    let counter = new SegmentCounter(view);

    for (const [milestone, day] of Object.entries(currentRun.milestones)) {
        if (!(milestone in view.milestones)) {
            continue;
        }

        const milestoneName = milestoneNameMap[milestone];

        const info = counter.next(milestone, day);
        if (info === undefined) {
            continue;
        }

        // Difference between the last common non-event milestone
        if (milestoneName in bestRunTimes && !isEventMilestone(milestone)) {
            offset = day - bestRunTimes[milestoneName];
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

    if (onlyRun) {
        const nextMilestone = `reset:${view.resetType}`;

        const info = counter.next(nextMilestone, currentRun.totalDays);
        if (info === undefined) {
            return entries;
        }

        entries.push({
            run: runIdx,
            raceName: currentRun.raceName,
            milestone: milestoneNameMap[nextMilestone],
            day: currentRun.totalDays,
            dayDiff: info.dayDiff,
            segment: info.segment,
            pending: true
        });
    }
    else {
        const reverseMilestoneNameMap = rotateMap(milestoneNameMap);

        // Skip until the first unachieved milestone
        let lastCommonIdx = -1;
        if (entries.length !== 0) {
            lastCommonIdx = bestRun.findLastIndex(entry => entry.milestone === entries[entries.length - 1].milestone);
        }

        const futureEntries = bestRun.slice(lastCommonIdx + 1).filter(entry => {
            const milestone = reverseMilestoneNameMap[entry.milestone];
            return !(milestone in currentRun.milestones) && !isEventMilestone(milestone);
        });

        if (futureEntries.length === 0) {
            return entries;
        }

        // Current segment
        const nextMilestone = reverseMilestoneNameMap[futureEntries[0].milestone];

        const { dayDiff, segment } = counter.next(nextMilestone, currentRun.totalDays)!;

        const overtime = segment >= futureEntries[0].segment;

        entries.push({
            run: runIdx,
            raceName: currentRun.raceName,
            milestone: futureEntries[0].milestone,
            day: currentRun.totalDays,
            dayDiff,
            segment,
            pending: true,
            overtime
        });

        if (overtime) {
            offset = currentRun.totalDays - futureEntries[0].day;
        }

        if (estimateFutureMilestones) {
            for (const entry of futureEntries) {
                const milestoneName = entry.milestone;
                const milestone = reverseMilestoneNameMap[milestoneName];

                const { dayDiff, segment } = counter.next(milestone, entry.day + offset)!;

                if (segment === 0) {
                    continue;
                }

                entries.push({
                    run: runIdx,
                    raceName: currentRun.raceName,
                    milestone: entry.milestone,
                    day: entry.day + offset,
                    dayDiff,
                    segment,
                    future: true
                });
            }
        }
    }

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
