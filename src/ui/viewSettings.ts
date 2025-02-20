import { makeSelect, makeSlider, makeCheckbox, makeNumberInput, makeToggleableNumberInput, makeFlexContainer } from "./utils";
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

            case "daysScale":
            case "starLevel":
                view[key] = value === "" ? undefined : Number(value);
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

    const starLevelInput = makeNumberInput("Any", view.starLevel, [0, 4])
        .on("change", bindThis("starLevel"));

    let skipRunsInput = $();
    let numRunsInput = $();

    const modeInput = makeSelect(Object.entries(viewModes), view.mode)
        .on("change", bindThis("mode"));

    const showBarsToggle = makeCheckbox("Bars", view.showBars, bind("showBars"));

    const showLinesToggle = makeCheckbox("Lines", view.showLines, bind("showLines"));

    const fillAreaToggle = makeCheckbox("Fill area", view.fillArea, bind("fillArea"));

    const avgWindowSlider = makeSetting("Smoothness", makeSlider([0, 100], view.smoothness, bind("smoothness")));

    const daysScaleInput = makeNumberInput("Auto", view.daysScale)
        .on("change", bindThis("daysScale"));

    onPropertyChange(["universe"], () => {
        const resetName = view.universe === "magic" ? "Vacuum Collapse" : "Black Hole";
        resetTypeInput.find(`> option[value="blackhole"]`).text(resetName);
    });

    onPropertyChange(["showLines", "mode"], () => {
        showBarsToggle.toggle(view.mode === "timestamp");
        showLinesToggle.toggle(view.mode === "timestamp");
        fillAreaToggle.toggle(view.showLines && view.mode === "timestamp");
        avgWindowSlider.toggle((view.showLines && view.mode === "timestamp") || view.mode === "duration");
    });

    const filterSettings = makeFlexContainer("row")
        .append(makeSetting("Reset type", resetTypeInput))
        .append(makeSetting("Universe", universeInput))
        .append(makeSetting("Star level", starLevelInput));

    const rangeSettings = makeFlexContainer("row")
        .append(skipRunsInput)
        .append(numRunsInput);

    const selectionSettings = makeFlexContainer("row")
        .append(filterSettings)
        .append(rangeSettings)

    const displaySettings = makeFlexContainer("row")
        .append(makeSetting("Mode", modeInput))
        .append(makeSetting("Days scale", daysScaleInput))
        .append(showBarsToggle)
        .append(showLinesToggle)
        .append(fillAreaToggle)
        .append(avgWindowSlider);

    const container = makeFlexContainer("column")
        .addClass("analytics-view-settings")
        .css("margin-bottom", "1em");

    container
        .append(selectionSettings)
        .append(displaySettings);

    function replaceLimitInputs(view: View) {
        skipRunsInput.remove();
        numRunsInput.remove();
        rangeSettings.append(skipRunsInput = makeToggleableNumberInput("Ignore first N runs", "None", view.skipRuns));
        rangeSettings.append(numRunsInput = makeToggleableNumberInput("Show last N runs", "All", view.numRuns));
    }

    replaceLimitInputs(view);
    view.on("update", replaceLimitInputs);

    return container;
}
