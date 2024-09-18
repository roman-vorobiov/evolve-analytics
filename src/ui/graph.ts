import { applyFilters } from "../exports/historyFiltering"
import { asPlotPoints, type PlotPoint } from "../exports/plotPoints"
import { milestoneEnabled, milestoneName } from "../milestones";
import type { ConfigManager, View } from "../config";
import type { HistoryManager } from "../history";

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

function timestamps(plotPoints: PlotPoint[], key: "day" | "segment") {
    const lastRunTimestamps = lastRunEntries(plotPoints).map(e => e[key]);

    return Plot.axisY(lastRunTimestamps, {
        anchor: "right",
        label: null
    });
}

function areaMarks(plotPoints: PlotPoint[]) {
    return Plot.areaY(plotPoints, {
        x: "run",
        y: "dayDiff",
        fill: "milestone",
        fillOpacity: 0.5
    });
}

function lineMarks(plotPoints: PlotPoint[], key: "day" | "segment") {
    return Plot.lineY(plotPoints, {
        x: "run",
        y: key,
        stroke: "milestone",
        // Draw the event lines on top of the other ones
        sort: (entry: PlotPoint) => entry.dayDiff === undefined ? 1 : 0,
        marker: "dot",
        tip: { format: { x: false } }
    });
}

export function makeGraph(history: HistoryManager, view: View) {
    const filteredRuns = applyFilters(history, view);
    const plotPoints = asPlotPoints(filteredRuns, history, view);

    const marks = [
        Plot.axisY({ anchor: "left", label: "days" }),
        Plot.axisX([], { label: null }),
        Plot.ruleY([0])
    ];

    if (view.mode.startsWith("Total")) {
        if (view.mode === "Total (filled)") {
            marks.push(areaMarks(plotPoints));
        }

        marks.push(lineMarks(plotPoints, "day"));
        marks.push(timestamps(plotPoints, "day"));
    }
    else if (view.mode === "Segmented") {
        marks.push(lineMarks(plotPoints, "segment"));
        marks.push(timestamps(plotPoints, "segment"));
    }

    const milestones = view.milestones.map(milestoneName);

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

    const node = Plot.plot({
        width: 800,
        y: { grid: true, domain: yScale },
        color: { legend: true, domain: milestones },
        marks
    });

    const legendMilestones = $(node).find("> div > span");

    legendMilestones
        .css("cursor", "pointer")
        .css("font-size", "1rem");

    for (const legendNode of legendMilestones) {
        const milestone = view.milestones.find(m => milestoneName(m) === $(legendNode).text());
        if (milestone !== undefined) {
            $(legendNode).toggleClass("crossed", !milestoneEnabled(milestone));
        }
    }

    legendMilestones.on("click", function() {
        view.toggleMilestone($(this).text());
    });

    const plot = $(node).find("> svg");
    plot.attr("width", "100%");
    plot.prepend(`
        <style>
            g[aria-label='tip'] g text {
                color: #4a4a4a;
            }
        </style>
    `);

    $(node).css("margin", "0");

    return node;
}
