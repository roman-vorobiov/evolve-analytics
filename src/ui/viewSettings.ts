import { makeNumberInput, makeSelect } from "./utils";
import { rotateMap } from "../utils";
import { resets, universes } from "../enums";
import type { View } from "../config";

export function makeViewSettings(view: View) {
    const resetTypeInput = makeSelect(Object.values(resets), view.resetType)
        .css("width", "150px")
        .on("change", function(this: HTMLInputElement) { view.resetType = this.value; });

    const reversedUniverseMap = rotateMap(universes);
    const universeInput = makeSelect(["Any", ...Object.values(universes)], view.universe ?? "Any")
        .css("width", "150px")
        .on("change", function(this: HTMLSelectElement) { view.universe = this.value === "Any" ? undefined : reversedUniverseMap[this.value]; });

    const modeInput = makeSelect(["Total", "Total (filled)", "Segmented"], view.mode)
        .css("width", "100px")
        .on("change", function(this: HTMLSelectElement) { view.mode = this.value; });

    const daysScaleInput = makeNumberInput("Auto", view.daysScale)
        .on("change", function(this: HTMLInputElement) { view.daysScale = Number(this.value) || undefined; });

    const numRunsInput = makeNumberInput("All", view.numRuns)
        .on("change", function(this: HTMLInputElement) { view.numRuns = Number(this.value) || undefined; });

    function makeInputNode(label: string, inputNode: JQuery<HTMLElement>) {
        return $(`<div>`).append(`<span style="margin-right: 8px">${label}</span>`).append(inputNode);
    }

    return $(`<div style="display: flex; flex-wrap: wrap; flex-direction: row; gap: 8px"></div>`)
        .append(makeInputNode("Reset type", resetTypeInput))
        .append(makeInputNode("Universe", universeInput))
        .append(makeInputNode("Mode", modeInput))
        .append(makeInputNode("Days scale", daysScaleInput))
        .append(makeInputNode("Show last N runs", numRunsInput));
}
