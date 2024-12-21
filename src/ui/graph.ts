import { applyFilters } from "../exports/historyFiltering";
import { asPlotPoints, runAsPlotPoints, type PlotPoint } from "../exports/plotPoints";
import { generateMilestoneNames } from "../milestones";
import type { View } from "../config";
import type { HistoryEntry, HistoryManager } from "../history";
import type { LatestRun } from "../runTracking";

import type { default as PlotType } from "@observablehq/plot";

declare const Plot: typeof PlotType;

function calculateYScale(plotPoints: PlotPoint[], view: View): [number, number] | undefined {
    if (view.daysScale) {
        return [0, view.daysScale];
    }
    else if (plotPoints.length === 0 || (!view.showBars && !view.showLines)) {
        // Default scale with empty history
        return [0, 1000];
    }
}

function lastRunEntries(plotPoints: PlotPoint[]): PlotPoint[] {
    const timestamps: PlotPoint[] = [];

    const lastRun: number | undefined = plotPoints[plotPoints.length - 1]?.run;
    for (let i = plotPoints.length - 1; i >= 0; --i) {
        const entry = plotPoints[i];

        if (entry.run !== lastRun) {
            break;
        }

        timestamps.push(entry);
    }

    return timestamps.reverse();
}

function smooth(smoothness: number, history: HistoryEntry[], params: any) {
    let avgWindowSize;
    switch (smoothness) {
        case 0:
            avgWindowSize = 1;
            break;

        case 100:
            avgWindowSize = history.length;
            break;

        default:
            // Make the transformation from the smoothness % into the number of runs exponential
            // because the average window has decreasingly less impact on the lines as it grows
            const curveSteepness = 5;
            const value = Math.exp(smoothness / 100 * curveSteepness - curveSteepness) * history.length;
            avgWindowSize = Math.round(value) || 1;
            break;
    }

    return Plot.windowY({ k: avgWindowSize }, params);
}

function* timestamps(plotPoints: PlotPoint[], key: "day" | "segment") {
    const lastRunTimestamps = lastRunEntries(plotPoints)
        .filter(entry => !entry.pending)
        .map(entry => entry[key]);

    yield Plot.axisY(lastRunTimestamps, {
        anchor: "right",
        label: null
    });
}

function* areaMarks(plotPoints: PlotPoint[], history: HistoryEntry[], smoothness: number) {
    yield Plot.areaY(plotPoints, smooth(smoothness, history, {
        x: "run",
        y: "dayDiff",
        z: "milestone",
        fill: "milestone",
        fillOpacity: 0.5,
        filter: (entry: PlotPoint) => entry.dayDiff !== undefined
    }));
}

function* lineMarks(plotPoints: PlotPoint[], history: HistoryEntry[], key: "day" | "segment", smoothness: number) {
    yield Plot.lineY(plotPoints, smooth(smoothness, history, {
        x: "run",
        y: key,
        z: "milestone",
        stroke: "milestone",
        // Draw the event lines on top of the other ones
        sort: (entry: PlotPoint) => entry.dayDiff === undefined ? 1 : 0
    }));
}

function* barMarks(plotPoints: PlotPoint[], key: "dayDiff" | "segment") {
    yield Plot.barY(plotPoints, {
        x: "run",
        y: key,
        z: "milestone",
        fill: "milestone",
        fillOpacity: 0.5,
        // Don't display event milestones as segments - use only the ticks
        filter: (entry: PlotPoint) => entry.dayDiff !== undefined
    });

    // Plot.stackY outputs the middle between y1 and y2 as y for whatever reason - use y2 to place ticks on top
    function stack(options: any) {
        const convert = ({ y1, y2, ...options }: any) => ({ ...options, y: y2 });
        return convert(Plot.stackY(options));
    }

    yield Plot.tickY(plotPoints, stack({
        x: "run",
        y: key,
        z: "milestone",
        stroke: "milestone",
        filter: (entry: PlotPoint) => entry.dayDiff !== undefined
    }));

    yield Plot.tickY(plotPoints, {
        x: "run",
        y: "segment",
        stroke: "milestone",
        filter: (entry: PlotPoint) => entry.dayDiff === undefined
    });
}

function tipText(point: PlotPoint, key: "day" | "dayDiff" | "segment", history: HistoryEntry[]) {
    let prefix;
    if (point.run === history.length) {
        prefix = "Current run";
    }
    else {
        prefix = `Run #${history[point.run].run}`;
    }

    if (point.raceName !== undefined) {
        prefix += ` (${point.raceName})`;
    }

    let suffix;
    if (point.pending) {
        suffix = `(in progress)`;
    }
    else {
        suffix = `in ${point[key]} day(s)`;
    }

    return `${prefix}: ${point.milestone} ${suffix}`;
}

function* linePointerMarks(plotPoints: PlotPoint[], history: HistoryEntry[], key: "day" | "segment") {
    yield Plot.text(plotPoints, Plot.pointerX({
        px: "run",
        py: key,
        dy: -17,
        frameAnchor: "top-left",
        text: (p: PlotPoint) => tipText(p, key, history)
    }));

    yield Plot.ruleX(plotPoints, Plot.pointerX({
        x: "run",
        py: key
    }));

    yield Plot.dot(plotPoints, Plot.pointerX({
        x: "run",
        y: key,
        fill: "currentColor",
        r: 2
    }));
}

function* rectPointerMarks(plotPoints: PlotPoint[], history: HistoryEntry[], segmentKey: "dayDiff" | "segment", tipKey: "day" | "segment") {
    // Transform pointer position from the point to the segment
    function toSegment(options: any) {
        const convert = ({ x, y, ...options }: any) => ({ px: x, py: y, ...options });
        return convert(Plot.stackY(options));
    }

    yield Plot.text(plotPoints, Plot.pointerX(toSegment({
        x: "run",
        y: segmentKey,
        dy: -17,
        frameAnchor: "top-left",
        text: (p: PlotPoint) => tipText(p, tipKey, history),
        filter: (entry: PlotPoint) => entry.dayDiff !== undefined
    })));

    yield Plot.barY(plotPoints, Plot.pointerX(Plot.stackY({
        x: "run",
        y: segmentKey,
        fill: "milestone",
        fillOpacity: 0.5,
        filter: (entry: PlotPoint) => entry.dayDiff !== undefined
    })));
}

export function makeGraph(history: HistoryManager, view: View, currentRun: LatestRun, onSelect: (run: HistoryEntry | null) => void) {
    const filteredRuns = applyFilters(history, view);

    const milestones: string[] = Object.keys(view.milestones);

    // Try to order the milestones in the legend in the order in which they happened during the last run
    if (filteredRuns.length !== 0) {
        const lastRun = filteredRuns[filteredRuns.length - 1];
        milestones.sort((l, r) => {
            const lIdx = lastRun.milestones.findIndex(([id]) => id === history.getMilestoneID(l));
            const rIdx = lastRun.milestones.findIndex(([id]) => id === history.getMilestoneID(r));
            return rIdx - lIdx;
        });
    }

    const plotPoints = asPlotPoints(filteredRuns, history, view);

    if (view.includeCurrentRun) {
        const currentRunPoints = runAsPlotPoints(currentRun, view, filteredRuns.length, milestones.slice().reverse());
        plotPoints.push(...currentRunPoints);
    }

    const marks = [
        Plot.axisY({ anchor: "left", label: "days" }),
        Plot.ruleY([0])
    ];

    if (view.showBars) {
        switch (view.mode) {
            case "timestamp":
                marks.push(...barMarks(plotPoints, "dayDiff"));
                marks.push(...timestamps(plotPoints, "day"));
                marks.push(...rectPointerMarks(plotPoints, filteredRuns, "dayDiff", "day"));
                break;

            case "duration":
                marks.push(...barMarks(plotPoints, "segment"));
                marks.push(...rectPointerMarks(plotPoints, filteredRuns, "segment", "segment"));
                break;

            default:
                break;
        }
    }

    if (view.showLines) {
        switch (view.mode) {
            case "timestamp":
                if (view.fillArea) {
                    marks.push(...areaMarks(plotPoints, filteredRuns, view.smoothness));
                }

                marks.push(...lineMarks(plotPoints, filteredRuns, "day", view.smoothness));
                marks.push(...timestamps(plotPoints, "day"));
                break;

            case "duration":
                marks.push(...lineMarks(plotPoints, filteredRuns, "segment", view.smoothness));
                marks.push(...timestamps(plotPoints, "segment"));
                break;

            default:
                break;
        }

        // Don't show the lines' pointer if the bars' one is shown or if the lines are smoothed
        if (!view.showBars && view.smoothness === 0) {
            const key = view.mode === "timestamp" ? "day" : "segment";
            marks.push(...linePointerMarks(plotPoints, filteredRuns, key));
        }
    }

    const plot = Plot.plot({
        width: 800,
        x: { axis: null },
        y: { grid: true, domain: calculateYScale(plotPoints, view) },
        color: { legend: true, domain: generateMilestoneNames(milestones, view.universe) },
        marks
    });

    plot.addEventListener("mousedown", () => {
        if (plot.value && plot.value.run < filteredRuns.length) {
            onSelect(filteredRuns[plot.value.run]);
        }
        else {
            onSelect(null);
        }
    });

    const legendMilestones = $(plot).find("> div > span");

    legendMilestones
        .css("cursor", "pointer")
        .css("font-size", "1rem");

    for (let i = 0; i !== legendMilestones.length; ++i) {
        const node = legendMilestones[i];
        const milestone = milestones[i];

        $(node).toggleClass("crossed", !view.milestones[milestone]);
    }

    legendMilestones.on("click", function() {
        const milestone = milestones[$(this).index() - 1];
        view.toggleMilestone(milestone);
    });

    $(plot).find("> svg").attr("width", "100%");

    $(plot).css("margin", "0");

    return plot;
}
