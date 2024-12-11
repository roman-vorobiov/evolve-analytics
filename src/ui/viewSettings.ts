import { makeSelect, makeSlider, makeCheckbox, makeToggleableNumberInput } from "./utils";
import { resets, universes, viewModes } from "../enums";
import type { View, ViewConfig } from "../config";

function makeSetting(label: string, inputNode: JQuery<HTMLElement>) {
    return $(`<div>`).append(`<span style="margin-right: 8px">${label}</span>`).append(inputNode);
}

function makeUniverseFilter(value: string): keyof typeof universes | undefined {
    if (value === "any") {
        return undefined;
    }
    else {
        return value as keyof typeof universes;
    }
}

export function makeViewSettings(view: View) {
    const propertyListeners: Record<string, Array<() => void>> = {};

    function onPropertyChange(props: (keyof ViewConfig)[], handler: () => void) {
        for (const prop of props) {
            const handlers = propertyListeners[prop] ??= [];
            handlers.push(handler);
        }

        handler();
    }

    function setValue(key: keyof ViewConfig, value: any) {
        switch (key) {
            case "universe":
                view.universe = makeUniverseFilter(value);
                break;

            case "numRuns":
                view.numRuns = Number(value) || undefined;
                break;

            default:
                (view as any)[key] = value;
                break;
        }

        propertyListeners[key]?.forEach(f => f());
    }

    const bindThis = (property: keyof ViewConfig) => {
        return function(this: HTMLInputElement) { setValue(property, this.value); };
    };

    const bind = (property: keyof ViewConfig) => {
        return (value: any) => setValue(property, value);
    };

    const resetTypeInput = makeSelect(Object.entries(resets), view.resetType)
        .on("change", bindThis("resetType"));

    const universeInput = makeSelect([["any", "Any"], ...Object.entries(universes)], view.universe ?? "any")
        .on("change", bindThis("universe"));

    const numRunsInput = makeToggleableNumberInput("Limit to last N runs", "All", view.numRuns, bind("numRuns"));

    const modeInput = makeSelect(Object.entries(viewModes), view.mode)
        .on("change", bindThis("mode"));

    const showBarsToggle = makeCheckbox("Bars", view.showBars, bind("showBars"));

    const showLinesToggle = makeCheckbox("Lines", view.showLines, bind("showLines"));

    const fillAreaToggle = makeCheckbox("Fill area", view.fillArea, bind("fillArea"));

    const avgWindowSlider = makeSetting("Smoothness", makeSlider([0, 100], view.smoothness, bind("smoothness")));

    onPropertyChange(["universe"], () => {
        const resetName = view.universe === "magic" ? "Vacuum Collapse" : "Black Hole";
        resetTypeInput.find(`> option[value="blackhole"]`).text(resetName);
    });

    onPropertyChange(["showLines", "mode"], () => {
        fillAreaToggle.toggle(view.showLines && view.mode === "timestamp");
    });

    onPropertyChange(["showLines"], () => {
        avgWindowSlider.toggle(view.showLines);
    });

    const filterSettings = $(`<div class="flex-container" style="flex-direction: row;"></div>`)
        .append(makeSetting("Reset type", resetTypeInput))
        .append(makeSetting("Universe", universeInput))
        .append(numRunsInput);

    const displaySettings = $(`<div class="flex-container" style="flex-direction: row;"></div>`)
        .append(makeSetting("Mode", modeInput))
        .append(showBarsToggle)
        .append(showLinesToggle)
        .append(fillAreaToggle)
        .append(avgWindowSlider);

    return $(`<div class="flex-container" style="flex-direction: column;"></div>`)
        .append(filterSettings)
        .append(displaySettings);
}