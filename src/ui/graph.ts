import { applyFilters } from "../exports/historyFiltering";
import { asPlotPoints, type PlotPoint } from "../exports/plotPoints";
import { generateMilestoneNames } from "../milestones";
import type { View } from "../config";
import type { HistoryEntry, HistoryManager } from "../history";

import type { default as PlotType } from "@observablehq/plot";

declare const Plot: typeof PlotType;

function calculateYScale(plotPoints: PlotPoint[], view: View): [number, number] | undefined {
    if (view.daysScale) {
        return [0, view.daysScale];
    }
    else if (plotPoints.length === 0) {
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

function* timestamps(plotPoints: PlotPoint[], key: "day" | "segment") {
    const lastRunTimestamps = lastRunEntries(plotPoints).map(e => e[key]);

    yield Plot.axisY(lastRunTimestamps, {
        anchor: "right",
        label: null
    });
}

function* areaMarks(plotPoints: PlotPoint[]) {
    yield Plot.areaY(plotPoints, {
        x: "run",
        y: "dayDiff",
        z: "milestone",
        fill: "milestone",
        fillOpacity: 0.5
    });
}

function* lineMarks(plotPoints: PlotPoint[], key: "day" | "segment") {
    yield Plot.line(plotPoints, {
        x: "run",
        y: key,
        z: "milestone",
        stroke: "milestone",
        // Draw the event lines on top of the other ones
        sort: (entry: PlotPoint) => entry.dayDiff === undefined ? 1 : 0
    });
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
    let prefix = `Run #${history[point.run].run}`;

    if (point.raceName !== undefined) {
        prefix += ` (${point.raceName})`;
    }

    return `${prefix}: ${point.milestone} in ${point[key]} day(s)`;
}

function* linePointerMarks(plotPoints: PlotPoint[], key: "day" | "segment", history: HistoryEntry[]) {
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

function* rectPointerMarks(plotPoints: PlotPoint[], segmentKey: "dayDiff" | "segment", tipKey: "day" | "segment", history: HistoryEntry[]) {
    plotPoints = plotPoints.filter((entry: PlotPoint) => entry.dayDiff !== undefined);

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
        text: (p: PlotPoint) => tipText(p, tipKey, history)
    })));

    yield Plot.barY(plotPoints, Plot.pointerX(Plot.stackY({
        x: "run",
        y: segmentKey,
        fill: "milestone",
        fillOpacity: 0.5
    })));
}

export function makeGraph(history: HistoryManager, view: View, onSelect: (run: HistoryEntry | null) => void) {
    const filteredRuns = applyFilters(history, view);
    const plotPoints = asPlotPoints(filteredRuns, history, view);

    const marks = [
        Plot.axisY({ anchor: "left", label: "days" }),
        Plot.ruleY([0])
    ];

    switch (view.mode) {
        // Same as "barsSegmented" but milestones become a part of the segment on top when hidden
        case "bars":
            marks.push(...barMarks(plotPoints, "dayDiff"));
            marks.push(...timestamps(plotPoints, "day"));
            marks.push(...rectPointerMarks(plotPoints, "dayDiff", "day", filteredRuns));
            break;

        // Vertical bars composed of individual segments stacked on top of each other
        case "barsSegmented":
            marks.push(...barMarks(plotPoints, "segment"));
            marks.push(...rectPointerMarks(plotPoints, "segment", "segment", filteredRuns));
            break;

        // Same as "total" but with the areas between the lines filled
        case "filled":
            marks.push(...areaMarks(plotPoints));
            // fall-through

        // Horizontal lines for each milestone timestamp
        case "total":
            marks.push(...lineMarks(plotPoints, "day"));
            marks.push(...timestamps(plotPoints, "day"));
            marks.push(...linePointerMarks(plotPoints, "day", filteredRuns));
            break;

        // Horizontal lines for each milestone duration
        case "segmented":
            marks.push(...lineMarks(plotPoints, "segment"));
            marks.push(...timestamps(plotPoints, "segment"));
            marks.push(...linePointerMarks(plotPoints, "segment", filteredRuns));
            break;
    }

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

    const yScale = calculateYScale(plotPoints, view);

    const plot = Plot.plot({
        width: 800,
        x: { axis: null },
        y: { grid: true, domain: yScale },
        color: { legend: true, domain: generateMilestoneNames(milestones) },
        marks
    });

    plot.addEventListener("mousedown", () => {
        if (plot.value) {
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

    for (let i = 0; i != legendMilestones.length; ++i) {
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
