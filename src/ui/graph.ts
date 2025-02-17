import { applyFilters } from "../exports/historyFiltering";
import { findBestRun, runTime } from "../exports/utils";
import { asPlotPoints, runAsPlotPoints, type PlotPoint } from "../exports/plotPoints";
import { generateMilestoneNames, isEffectMilestone } from "../milestones";
import { compose } from "../utils";
import { makeColorPicker } from "./utils";
import type { View } from "../config";
import type { HistoryEntry, HistoryManager } from "../history";
import type { LatestRun } from "../runTracking";
import type { Game } from "../game";

import type * as PlotType from "@observablehq/plot";

declare const Plot: typeof PlotType;

const topTextOffset = -27;
const marginTop = 30;

function only({ type, status }: { type?: string[] | string, status?: string[] | string }) {
    let impl = (point: PlotPoint) => true;

    function getType(point: PlotPoint) {
        if (point.event) {
            return "event";
        }
        else if (point.effect) {
            return "effect";
        }
        else {
            return "milestone";
        }
    }

    function getStatus(point: PlotPoint) {
        if (point.pending) {
            return "pending";
        }
        else if (point.future) {
            return "future";
        }
        else {
            return "past";
        }
    }

    if (Array.isArray(type)) {
        impl = compose(impl, (point: PlotPoint) => type.includes(getType(point)));
    }
    else if (type !== undefined) {
        impl = compose(impl, (point: PlotPoint) => getType(point) === type);
    }

    if (Array.isArray(status)) {
        impl = compose(impl, (point: PlotPoint) => status.includes(getStatus(point)));
    }
    else if (status !== undefined) {
        impl = compose(impl, (point: PlotPoint) => getStatus(point) === status);
    }

    return impl;
}

function not(filter: { type?: string[] | string, status?: string[] | string }) {
    const impl = only(filter);
    return (point: PlotPoint) => !impl(point);
}

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

function smooth<T>(smoothness: number, history: HistoryEntry[], params: T): T {
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

// Plot.stackY outputs the middle between y1 and y2 as y for whatever reason - use y2 to place ticks on top
function adjustedStackY<T>(options: T & PlotType.StackOptions) {
    const convert = ({ y1, y2, ...options }: any) => ({ ...options, y: y2 });
    return convert(Plot.stackY(options));
}

function* timestamps(plotPoints: PlotPoint[], key: "day" | "segment") {
    const lastRunTimestamps = lastRunEntries(plotPoints)
        .filter(point => !point.effect && !point.pending)
        .map(entry => entry[key]);

    yield Plot.axisY(lastRunTimestamps, {
        anchor: "right",
        label: null
    });
}

function* statsMarks(runs: HistoryEntry[], bestRun: HistoryEntry | undefined) {
    if (bestRun === undefined) {
        return;
    }

    // Might not be in the selection
    const bestIdx = runs.indexOf(bestRun);
    if (bestIdx !== -1) {
        yield Plot.axisX([bestIdx], {
            tickFormat: () => "PB",
            anchor: "bottom",
            label: null
        });
    }

    const bestTime = runTime(bestRun);
    const averageTime = Math.round(runs.reduce((acc, entry) => acc + runTime(entry), 0) / runs.length);

    yield Plot.text([0], {
        dy: topTextOffset,
        frameAnchor: "top-right",
        text: () => `Fastest (all time): ${bestTime} day(s)\nAverage (${runs.length} runs): ${averageTime} day(s)`
    });
}

function* areaMarks(plotPoints: PlotPoint[], history: HistoryEntry[], smoothness: number) {
    yield Plot.areaY(plotPoints, smooth(smoothness, history, {
        x: "run",
        y: "dayDiff",
        z: "milestone",
        fill: "milestone",
        fillOpacity: 0.5,
        filter: only({ type: "milestone", status: ["past", "pending"] }),
        title: "milestone"
    }));

    yield Plot.areaY(plotPoints, smooth(smoothness, history, {
        x: "run",
        y1: "day",
        y2: (entry: PlotPoint) => entry.day - entry.segment,
        z: "milestone",
        fill: "milestone",
        fillOpacity: 0.5,
        filter: only({ type: "event" }),
        title: "milestone"
    }));
}

function* lineMarks(plotPoints: PlotPoint[], history: HistoryEntry[], key: "day" | "segment", smoothness: number) {
    yield Plot.lineY(plotPoints, smooth(smoothness, history, {
        x: "run",
        y: key,
        z: "milestone",
        stroke: "milestone",
        filter: only({ type: ["milestone", "event"] }),
        title: "milestone"
    }));
}

function* barMarks(plotPoints: PlotPoint[], key: "dayDiff" | "segment") {
    yield Plot.barY(plotPoints, {
        x: "run",
        y: key,
        z: "milestone",
        fill: "milestone",
        fillOpacity: (entry: PlotPoint) => entry.future ? 0.25 : 0.5,
        filter: only({ type: "milestone" }),
        title: "milestone"
    });

    yield Plot.tickY(plotPoints, adjustedStackY({
        x: "run",
        y: key,
        z: "milestone",
        stroke: "milestone",
        filter: only({ type: "milestone" }),
        title: "milestone"
    }));
}

function inferBarWidth(plotPoints: PlotPoint[]) {
    const plot = Plot.plot({
        width: 800,
        marks: [...barMarks(plotPoints, "dayDiff")]
    });

    return Number($(plot).find("g[aria-label='bar'] > rect").attr("width"));
}

function* segmentMarks(plotPoints: PlotPoint[], numRuns: number) {
    const effectPoints = plotPoints.filter(only({ type: "effect" }));

    const barWidth = inferBarWidth(plotPoints);

    const isTemperature = (entry: PlotPoint) => entry.milestone === "Hot days" || entry.milestone === "Cold days";

    function* impl(dx: number, filter: (point: PlotPoint) => boolean) {
        yield Plot.ruleX(effectPoints, {
            x: "run",
            dx,
            y1: "day",
            y2: (entry: PlotPoint) => entry.day - entry.segment,
            stroke: "milestone",
            strokeWidth: Math.max(0.75, Math.min(2, 40 / numRuns)),
            strokeOpacity: 0.75,
            filter,
            title: "milestone"
        });

        const dotBase = {
            x: "run",
            dx,
            r: 0.75,
            fill: "milestone",
            stroke: "milestone",
            strokeWidth: Math.max(0.5, Math.min(2, 40 / numRuns)),
            strokeOpacity: 0.75,
            filter,
            title: "milestone"
        };

        yield Plot.dot(effectPoints, { ...dotBase, y: "day", filter: compose(filter, not({ status: "pending" })) });
        yield Plot.dot(effectPoints, { ...dotBase, y: (entry: PlotPoint) => entry.day - entry.segment });
    }

    yield* impl(barWidth / 4, (point) => !isTemperature(point));
    yield* impl(-barWidth / 4, (point) => isTemperature(point));
}

function* lollipopMarks(plotPoints: PlotPoint[], stack: boolean, numRuns: number) {
    const dotBase = {
        x: "run",
        r: Math.min(2, 80 / numRuns),
        fill: "milestone",
        stroke: "milestone",
        filter: only({ type: "event", status: "past" }),
        title: "milestone"
    };

    if (stack) {
        yield Plot.ruleX(plotPoints, Plot.stackY({
            x: "run",
            y: "segment",
            stroke: "milestone",
            strokeOpacity: 0.5,
            filter: only({ type: "event" }),
            title: "milestone"
        }));

        yield Plot.dot(plotPoints, adjustedStackY({ ...dotBase, y: "segment" }));
    }
    else {
        yield Plot.ruleX(plotPoints, {
            x: "run",
            y1: "day",
            y2: (entry: PlotPoint) => entry.day - entry.segment,
            stroke: "milestone",
            strokeOpacity: 1,
            filter: only({ type: "event" }),
            title: "milestone"
        });

        yield Plot.dot(plotPoints, { ...dotBase, y: "day" });
    }
}

function tipText(point: PlotPoint, key: "day" | "dayDiff" | "segment", history: HistoryEntry[]) {
    let prefix;
    if (point.run === history.length) {
        prefix = "Current run";
    }
    else {
        prefix = `Run #${history[point.run].run}`;
    }

    const hasExtraInfo = ["combatDeaths", "junkTraits"].some(k => point[k as keyof PlotPoint] !== undefined);

    if (point.raceName !== undefined && !hasExtraInfo) {
        prefix += ` (${point.raceName})`;
    }

    let suffix;
    if (point.pending) {
        suffix = `(in progress)`;
    }
    else {
        suffix = `in ${point[key]} day(s)`;

        if (point.future) {
            suffix += ` (PB pace)`;
        }
    }

    const extraInfo: string[] = [];

    if (point.raceName !== undefined && hasExtraInfo) {
        extraInfo.push(`Race: ${point.raceName}`);
    }

    if (point.combatDeaths !== undefined) {
        extraInfo.push(`Died in combat: ${point.combatDeaths}`);
    }

    if (point.junkTraits !== undefined) {
        const genes = Object.entries(point.junkTraits).map(([trait, rank]) => `${trait} (${rank})`);
        extraInfo.push(`Junk traits: ${genes.join(", ")}`);
    }

    if (extraInfo.length > 0) {
        suffix += `\n${extraInfo.join("; ")}`
    }

    return `${prefix}: ${point.milestone} ${suffix}`;
}

function* linePointerMarks(plotPoints: PlotPoint[], history: HistoryEntry[], key: "day" | "segment") {
    yield Plot.text(plotPoints, Plot.pointerX({
        px: "run",
        py: key,
        dy: topTextOffset,
        frameAnchor: "top-left",
        text: (p: PlotPoint) => tipText(p, key, history),
        filter: not({ type: "effect" })
    }));

    yield Plot.ruleX(plotPoints, Plot.pointerX({
        x: "run",
        py: key,
        filter: not({ type: "effect" })
    }));

    yield Plot.dot(plotPoints, Plot.pointerX({
        x: "run",
        y: key,
        fill: "currentColor",
        r: 2,
        filter: not({ type: "effect" })
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
        dy: topTextOffset,
        frameAnchor: "top-left",
        text: (entry: PlotPoint) => tipText(entry, tipKey, history),
        filter: only({ type: "milestone" })
    })));

    yield Plot.barY(plotPoints, Plot.pointerX(Plot.stackY({
        x: "run",
        y: segmentKey,
        fill: "milestone",
        fillOpacity: 0.5,
        filter: only({ type: "milestone" })
    })));
}

function generateMarks(plotPoints: PlotPoint[], filteredRuns: HistoryEntry[], bestRun: HistoryEntry | undefined, view: View) {
    const marks = [
        Plot.axisY({ anchor: "left", label: "days" }),
        Plot.ruleY([0])
    ];

    switch (view.mode) {
        case "timestamp":
            if (view.showBars) {
                marks.push(...barMarks(plotPoints, "dayDiff"));
                marks.push(...segmentMarks(plotPoints, filteredRuns.length));
                marks.push(...lollipopMarks(plotPoints, false, filteredRuns.length));
                marks.push(...rectPointerMarks(plotPoints, filteredRuns, "dayDiff", "day"));
            }

            if (view.showLines) {
                if (view.fillArea) {
                    marks.push(...areaMarks(plotPoints, filteredRuns, view.smoothness));
                }

                marks.push(...lineMarks(plotPoints, filteredRuns, "day", view.smoothness));

                // Don't show the lines' pointer if the bars' one is shown or if the lines are smoothed
                if (!view.showBars && view.smoothness === 0) {
                    marks.push(...linePointerMarks(plotPoints, filteredRuns, "day"));
                }
            }

            marks.push(...timestamps(plotPoints, "day"));
            marks.push(...statsMarks(filteredRuns, bestRun));
            break;

        case "duration":
            marks.push(...lineMarks(plotPoints, filteredRuns, "segment", view.smoothness));
            marks.push(...timestamps(plotPoints, "segment"));
            marks.push(...linePointerMarks(plotPoints, filteredRuns, "segment"));
            break;

        case "durationStacked":
            marks.push(...barMarks(plotPoints, "segment"));
            marks.push(...lollipopMarks(plotPoints, true, filteredRuns.length));
            marks.push(...rectPointerMarks(plotPoints, filteredRuns, "segment", "segment"));
            break;

        default:
            break;
    }

    return marks;
}

function processCurrentRun(
    currentRun: LatestRun,
    filteredRuns: HistoryEntry[],
    bestRun: HistoryEntry | undefined,
    view: View,
    history: HistoryManager,
    game: Game
) {
    const bestRunEntries = bestRun !== undefined ? asPlotPoints([bestRun], history, view, game) : [];

    const estimate = view.mode === "timestamp";

    const idx = filteredRuns.length;

    return runAsPlotPoints(currentRun, view, game, bestRunEntries, estimate, idx);
}

export function makeGraph(history: HistoryManager, view: View, game: Game, currentRun: LatestRun, onSelect: (run: HistoryEntry | null) => void) {
    const filteredRuns = applyFilters(history, view);
    const bestRun = findBestRun(history, view);

    const plotPoints = asPlotPoints(filteredRuns, history, view, game);
    if (view.includeCurrentRun) {
        plotPoints.push(...processCurrentRun(currentRun, filteredRuns, bestRun, view, history, game));
    }

    const milestones = Object.keys(view.milestones).sort((l, r) => view.milestones[l].index - view.milestones[r].index);
    const milestoneNames = generateMilestoneNames(milestones, view.universe);
    const milestoneColors = milestones.map(m => view.milestones[m].color);

    const plot = Plot.plot({
        marginTop,
        width: 800,
        x: { axis: null },
        y: { grid: true, domain: calculateYScale(plotPoints, view) },
        color: { legend: true, domain: milestoneNames, range: milestoneColors },
        marks: generateMarks(plotPoints, filteredRuns, bestRun, view)
    });

    // When creating marks, we add a title with the milestone name
    // Remove the generateed title element and add an attribute
    $(plot).find("g > *").each(function() {
        const title = $(this).find("> title");
        if (title[0] !== undefined) {
            const milestone = title.text();
            $(this).attr("data-milestone", milestone);
            title.remove();
        }
    });

    // Handle selection
    plot.addEventListener("mousedown", () => {
        if (plot.value && plot.value.run < filteredRuns.length) {
            onSelect(filteredRuns[plot.value.run]);
        }
        else {
            onSelect(null);
        }
    });

    // Process legend
    $(plot).find("> div > span").each(function() {
        const svgNode = $(this).find("> svg");

        const milestone = milestones[$(this).index() - 1];
        const milestoneName = milestoneNames[$(this).index() - 1];

        const defaultColor = svgNode.attr("fill")!;

        // Styling
        $(this).css("font-size", "1rem");

        if (isEffectMilestone(milestone)) {
            svgNode
                .attr("fill", null)
                .attr("fill-opacity", "0")
                .attr("stroke", defaultColor);
        }

        // Toggle milestones on click
        $(this).css("cursor", "pointer")

        $(this).toggleClass("crossed", !view.milestones[milestone].enabled);

        $(this).on("click", function(event) {
            // Ignore clicks on the svg
            if (event.target !== this) {
                return;
            }

            const milestone = milestones[$(this).index() - 1];
            view.toggleMilestone(milestone);
        });

        // Set up color picker
        const setMarksColor = (value: string) => {
            function impl() {
                if ($(this).attr("fill") !== undefined) {
                    $(this).attr("fill", value);
                }
                if ($(this).attr("stroke") !== undefined) {
                    $(this).attr("stroke", value);
                }
            }

            svgNode.each(impl);

            $(`figure [data-milestone="${milestoneName}"]`).each(impl);
        };

        makeColorPicker(svgNode, 3, defaultColor, {
            onChange: setMarksColor,
            onSave: (value) => view.setMilestoneColor(milestone, value),
            currentColor: () => view.milestones[milestone].color
        });
    });

    $(plot).find("> svg").attr("width", "100%");

    $(plot).css("margin", "0");

    return plot;
}
