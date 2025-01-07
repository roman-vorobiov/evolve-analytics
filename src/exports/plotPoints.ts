import { generateMilestoneNames } from "../milestones";
import eventsInfo from "../events";
import { zip, rotateMap, lastValue, patternMatch } from "../utils";
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
    future?: boolean
}

function makeMilestoneNamesMapping(view: ViewConfig): Record<string, string> {
    const milestones = Object.keys(view.milestones);
    const milestoneNames = generateMilestoneNames(milestones, view.universe);

    return Object.fromEntries(zip(milestones, milestoneNames));
}

function isEventMilestone(milestone: string) {
    return milestone.startsWith("event:");
}

type CounterOptions = {
    expected: boolean
}

class SegmentCounter {
    private milestones = new Map<string, number>();
    private events = new Map<string, number>();
    private eventConditions = new Map<string, number>();
    private expectedMilestones = new Map<string, number>();
    private _futureMilestones: [string, number][] | undefined = undefined;

    constructor(private view: ViewConfig) {}

    onMilestone(milestone: string, day: number, options?: Partial<CounterOptions>) {
        const saveTo = (collection: Map<string, number>) => {
            if (milestone in this.view.milestones) {
                collection.set(milestone, day);
            }
        };

        if (options?.expected) {
            if (!isEventMilestone(milestone)) {
                saveTo(this.expectedMilestones);
            }
        }
        else {
            patternMatch(milestone, [
                [/event_condition:(.+)/, (event) => this.eventConditions.set(event, day)],
                [/event:.+/, () => saveTo(this.events)],
                [/.+/, () => saveTo(this.milestones)]
            ]);
        }
    }

    *segments() {
        let previousDay = 0;
        let previousEnabledDay = 0;

        // Past milestones
        for (const [milestone, day] of this.milestones.entries()) {
            if (this.view.milestones[milestone]) {
                yield {
                    milestone,
                    day,
                    segment: day - previousDay,
                    dayDiff: day - previousEnabledDay
                };
            }

            previousDay = day;
            if (this.view.milestones[milestone]) {
                previousEnabledDay = day;
            }
        }

        // Past events
        for (const [milestone, day] of this.events.entries()) {
            if (this.view.milestones[milestone]) {
                const event = milestone.slice('event:'.length) as keyof typeof eventsInfo;
                const defaultTriggerDay = (eventsInfo[event]?.conditionMet === undefined) ? 0 : day
                const preconditionDay = this.eventConditions.get(event) ?? defaultTriggerDay;

                yield {
                    milestone,
                    day,
                    segment: day - preconditionDay
                };
            }
        }
    }

    *pendingSegments(currentDay: number) {
        const lastMilestoneDay = lastValue(this.milestones) ?? 0;
        const lastEnabledMilestoneDay = lastValue(this.milestones, (milestone) => this.view.milestones[milestone]) ?? 0;

        // Pending milestone
        const milestone = this.futureMilestones[0]?.[0] ?? `reset:${this.view.resetType}`;
        if (this.view.milestones[milestone]) {
            yield {
                milestone,
                day: currentDay,
                segment: currentDay - lastMilestoneDay,
                dayDiff: currentDay - lastEnabledMilestoneDay
            };
        }

        // Pending events
        for (const [event, preconditionDay] of this.eventConditions.entries()) {
            const milestone = `event:${event}`;
            if (this.view.milestones[milestone] && !this.events.has(milestone)) {
                yield {
                    milestone,
                    day: currentDay,
                    segment: currentDay - preconditionDay
                };
            }
        }
    }

    *futureSegments(currentDay: number) {
        if (this.futureMilestones.length === 0) {
            return;
        }

        const [nextMilestone, nextMilestoneDay] = this.futureMilestones[0];
        const possibleTimeSave = Math.max(0, nextMilestoneDay - currentDay);
        const timeLoss = Math.max(0, currentDay - nextMilestoneDay);

        // Squish the immediate segment if it's covered by the pending one
        yield {
            milestone: nextMilestone,
            day: Math.max(nextMilestoneDay, currentDay),
            segment: possibleTimeSave,
            dayDiff: possibleTimeSave
        };

        let previousDay = nextMilestoneDay;
        for (const [milestone, day] of this.futureMilestones.slice(1)) {
            const segment = day - previousDay;

            yield {
                milestone,
                day: day + timeLoss,
                segment,
                dayDiff: segment
            };

            previousDay = day;
        }
    }

    private get futureMilestones() {
        if (this._futureMilestones === undefined) {
            this._futureMilestones = this.calculateFutureMilestones();
        }

        return this._futureMilestones;
    }

    private calculateFutureMilestones(): [string, number][] {
        const expectedMilestones = [...this.expectedMilestones.entries()];
        const isReached = ([milestone]: [string, number]) => this.milestones.has(milestone);

        // Skip until the first unachieved milestone
        let lastCommonIdx = -1;
        if (this.milestones.size !== 0) {
            lastCommonIdx = expectedMilestones.findLastIndex(isReached);
        }

        // Adjust future timestamps based on the last segment's pace
        let offset = 0;
        if (lastCommonIdx !== -1) {
            const [milestone, day] = expectedMilestones[lastCommonIdx];
            offset = this.milestones.get(milestone)! - day;
        }

        return expectedMilestones
            .slice(lastCommonIdx + 1)
            .filter(entry => !isReached(entry))
            .map(([milestone, day]) => [milestone, day + offset]);
    }
}

export function runAsPlotPoints(
    currentRun: LatestRun,
    view: ViewConfig,
    bestRun: PlotPoint[] | undefined,
    estimateFutureMilestones: boolean,
    runIdx: number
): PlotPoint[] {
    const milestoneNames = makeMilestoneNamesMapping(view);
    const milestonesByName = rotateMap(milestoneNames);

    const counter = new SegmentCounter(view);

    const sortedMilestones = Object.entries(currentRun.milestones).toSorted(([, l], [, r]) => l - r);
    for (const [milestone, day] of sortedMilestones) {
        counter.onMilestone(milestone, day);
    }

    if (bestRun !== undefined && bestRun.length !== 0) {
        for (const entry of bestRun) {
            const milestone = milestonesByName[entry.milestone];
            counter.onMilestone(milestone, entry.day, { expected: true })
        }
    }

    const entries: PlotPoint[] = [];

    const addEntry = (milestone: string, options: Omit<PlotPoint, "run" | "raceName" | "milestone">) => {
        entries.push({
            run: runIdx,
            raceName: currentRun.raceName,
            milestone: milestoneNames[milestone],
            ...options
        });
    };

    for (const { milestone, day, segment, dayDiff } of counter.segments()) {
        addEntry(milestone, { day, dayDiff, segment });
    }

    for (const { milestone, day, segment, dayDiff } of counter.pendingSegments(currentRun.totalDays)) {
        addEntry(milestone, { day, dayDiff, segment, pending: true });
    }

    if (estimateFutureMilestones) {
        for (const { milestone, day, segment, dayDiff } of counter.futureSegments(currentRun.totalDays)) {
            addEntry(milestone, { day, dayDiff, segment, future: true });
        }
    }

    return entries;
}

export function asPlotPoints(filteredRuns: HistoryEntry[], history: HistoryManager, view: ViewConfig): PlotPoint[] {
    const milestoneNames = makeMilestoneNamesMapping(view);

    const entries: PlotPoint[] = [];

    for (let i = 0; i !== filteredRuns.length; ++i) {
        const run = filteredRuns[i];

        const counter = new SegmentCounter(view);

        for (const [milestoneID, day] of run.milestones) {
            const milestone = history.getMilestone(milestoneID);
            counter.onMilestone(milestone, day);
        }

        for (const { milestone, day, segment, dayDiff } of counter.segments()) {
            const milestoneName = milestoneNames[milestone];

            entries.push({
                run: i,
                raceName: run.raceName,
                milestone: milestoneName,
                day,
                dayDiff,
                segment
            });
        }
    }

    return entries;
}
