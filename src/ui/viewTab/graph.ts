import { events } from "../../enums";
import { history, type HistoryEntry } from "../../history";
import type { View } from "../../view";
import type { default as PlotType } from "@observablehq/plot";

declare const Plot: typeof PlotType;

function filterHistory(view: View) {
    function getResetType(entry: HistoryEntry) {
        const milestoneID = entry.milestones[entry.milestones.length - 1][0];
        return history.getMilestone(milestoneID);
    }

    const entriesToSkip = view.numRuns ? Math.max(history.runs.length - view.numRuns, 0) : 0;

    const entries = [];
    for (let i = entriesToSkip; i !== history.runs.length; ++i) {
        const entry = history.runs[i];

        if (getResetType(entry) !== view.resetType) {
            continue;
        }

        if (view.universe !== undefined && entry.universe !== view.universe) {
            continue;
        }

        entries.push(entry);
    }
    return entries;
}

function preprocessRunData(historyEntries: HistoryEntry[], view: View) {
    const milestones = Object.fromEntries(view.milestones.filter(m => m.enabled).map(m => [m.name, m]));

    const entries = [];
    for (let i = 0; i !== historyEntries.length; ++i) {
        let previousDay = 0;
        let previousEnabledDay = 0;

        // Don't treat events as segments
        const eventMilestones = [];

        for (const [milestoneID, day] of historyEntries[i].milestones) {
            const milestone = history.getMilestone(milestoneID);

            if (events.includes(milestone)) {
                eventMilestones.push([milestone, day]);
                continue;
            }

            const dayDiff = day - previousEnabledDay;
            const segment = day - previousDay;

            previousDay = day;

            if (!(milestone in milestones)) {
                continue;
            }

            entries.push({ run: i, milestone, day, dayDiff, segment });

            previousEnabledDay = day;
        }

        for (const [milestone, day] of eventMilestones) {
            entries.push({ run: i, milestone, day });
        }
    }

    return entries;
}

export function makeGraph(view: View) {
    const milestoneIDs = view.milestones.map(m => history.getMilestoneID(m.name));
    const enabledMilestoneIDs = view.milestones.filter(m => m.enabled).map(m => history.getMilestoneID(m.name));

    // Create a milestone for the reset
    const filteredHistory = filterHistory(view);

    // Duplicate the single entry so that lines can be plotted
    if (filteredHistory.length === 1) {
        filteredHistory.push(filteredHistory[0]);
    }

    const lastRun = filteredHistory[filteredHistory.length - 1];
    const lastRunTimestamps = lastRun?.milestones.filter(([id]) => enabledMilestoneIDs.includes(id)).map(([, days]) => days) ?? [];

    const entries = preprocessRunData(filteredHistory, view);

    let yScale = undefined;
    if (view.daysScale) {
        yScale = [0, view.daysScale];
    }
    else if (lastRun === undefined) {
        // Default scale with empty history
        yScale = [0, 1000];
    }

    // Try to order the milestones in the legend in the order in which they happen during a run
    if (lastRun !== undefined) {
        milestoneIDs.sort((l, r) => lastRun.milestones.findIndex(([id]) => id === r) - lastRun.milestones.findIndex(([id]) => id === l));
    }

    const marks = [
        Plot.axisY({ anchor: "left", label: "days" }),
        Plot.axisX([], { label: null }),
        Plot.ruleY([0])
    ];

    if (view.mode.startsWith("Total")) {
        if (view.mode === "Total (filled)") {
            marks.push(Plot.areaY(entries, { x: "run", y: "dayDiff", fill: "milestone", fillOpacity: 0.5 }));
        }

        marks.push(Plot.lineY(entries, { x: "run", y: "day", stroke: "milestone", marker: "dot", tip: { format: { x: false } } }));
        marks.push(Plot.axisY(lastRunTimestamps, { anchor: "right" }));
    }
    else if (view.mode === "Segmented") {
        marks.push(Plot.lineY(entries, { x: "run", y: "segment", stroke: "milestone", marker: "dot", tip: { format: { x: false } } }));
    }

    const node = Plot.plot({
        width: 800,
        y: { grid: true, domain: yScale },
        color: { legend: true, domain: milestoneIDs.map(id => history.getMilestone(id)) },
        marks
    });

    const legendMilestones = $(node).find("> div > span");

    legendMilestones
        .css("cursor", "pointer")
        .css("font-size", "1rem");

    for (const legendNode of legendMilestones) {
        const milestone = view.findMilestone($(legendNode).text());
        if (milestone !== undefined) {
            $(legendNode).toggleClass("crossed", !milestone.enabled);
        }
    }

    legendMilestones.on("click", function() {
        const milestone = view.findMilestone($(this).text());
        if (milestone !== undefined) {
            milestone.enabled = !milestone.enabled;
        }
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
