import { makeNumberInput, makeSelect } from "./utils";
import { resets, universes, viewModes } from "../enums";
import type { View } from "../config";

function makeSetting(label: string, inputNode: JQuery<HTMLElement>) {
    return $(`<div>`).append(`<span style="margin-right: 8px">${label}</span>`).append(inputNode);
}

export function makeViewSettings(view: View) {
    const resetTypeInput = makeSelect(Object.entries(resets), view.resetType)
        .css("width", "150px")
        .on("change", function(this: HTMLInputElement) { view.resetType = this.value as keyof typeof resets; });

    function updateResetTypes(universe: string) {
        resetTypeInput.find(`> option[value="blackhole"]`).text(universe === "magic" ? "Vacuum Collapse" : "Black Hole");
    }

    // In case an existing view is blackhole + magic
    updateResetTypes(view.universe ?? "any");

    const universeInput = makeSelect([["any", "Any"], ...Object.entries(universes)], view.universe ?? "any")
        .css("width", "150px")
        .on("change", function(this: HTMLSelectElement) {
            updateResetTypes(this.value);

            if (this.value === "any") {
                view.universe = undefined;
            }
            else {
                view.universe = this.value as keyof typeof universes;
            }
        });

    const modeInput = makeSelect(Object.entries(viewModes), view.mode)
        .css("width", "150px")
        .on("change", function(this: HTMLSelectElement) { view.mode = this.value as keyof typeof viewModes; });

    const daysScaleInput = makeNumberInput("Auto", view.daysScale)
        .on("change", function(this: HTMLInputElement) { view.daysScale = Number(this.value) || undefined; });

    const numRunsInput = makeNumberInput("All", view.numRuns)
        .on("change", function(this: HTMLInputElement) { view.numRuns = Number(this.value) || undefined; });

    return $(`<div style="display: flex; flex-wrap: wrap; flex-direction: row; gap: 8px"></div>`)
        .append(makeSetting("Reset type", resetTypeInput))
        .append(makeSetting("Universe", universeInput))
        .append(makeSetting("Mode", modeInput))
        .append(makeSetting("Days scale", daysScaleInput))
        .append(makeSetting("Show last N runs", numRunsInput));
}
