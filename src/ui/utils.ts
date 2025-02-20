import colorScheme from "../enums/colorSchemes";

import { default as Pickr } from "@simonwep/pickr";
import type { default as JQuery } from "jquery";
import "jqueryui";

declare const $: typeof JQuery;

export function waitFor(query: any) {
    return new Promise(resolve => {
        const node = $(query);
        if (node.length !== 0) {
            return resolve(node);
        }

        const observer = new MutationObserver(() => {
            const node = $(query);
            if (node.length !== 0) {
                observer.disconnect();
                resolve(node);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

export async function nextAnimationFrame() {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
        });
    });
}

export function lastChild(node: JQuery) {
    const children = node.children();
    const length = children.length;
    return children[length - 1];
}

export function makeFlexContainer(direction: "row" | "column") {
    return $(`<div class="flex-container" style="flex-direction: ${direction};"></div>`);
}

export function makeSelect(options: [string, string][], defaultValue?: string) {
    const optionNodes = options.map(([value, label]) => {
        return `<option value="${value}" ${value === defaultValue ? "selected" : ""}>${label}</option>`;
    });

    return $(`
        <select style="width: auto">
            ${optionNodes}
        </select>
    `);
}

type AugmentedSelectElement = HTMLSelectElement & { _value: string | undefined }

function toAutocompleteOptions(map: Record<string, string>) {
    return Object.entries(map).map(([id, name]) => ({ value: id, label: name }));
}

export function makeAutocompleteInput(placeholder: string, options: Record<string, string>): JQuery<AugmentedSelectElement> {
    const entries = toAutocompleteOptions(options);

    function onChange(event: Event, ui: JQueryUI.AutocompleteUIParams) {
        // If it wasn't selected from list
        if (ui.item === null){
            const item = entries.find(({ label }) => label === this.value);
            if (item !== undefined) {
                ui.item = item;
            }
        }

        if (ui.item !== null) {
            // Replace the input contents with the label and keep the value somewhere
            this.value = ui.item.label;
            this._value = ui.item.value;
        }
        else {
            // Keep the input contents as the user typed it and discard the previous value
            this._value = undefined;
        }

        return false;
    }

    return <JQuery<AugmentedSelectElement>> $(`<input style="width: 200px" placeholder="${placeholder}"></input>`).autocomplete({
        source: entries,
        minLength: 2,
        delay: 0,
        select: onChange, // Dropdown list click
        focus: onChange, // Arrow keys press
        change: onChange, // Keyboard type
        classes: {
            "ui-autocomplete": "bg-dark w-fit"
        }
    });
}

export function makeSlimButton(text: string) {
    return $(`<button class="button" style="height: 22px">${text}</button>`);
}

export function makeNumberInput(placeholder: string, defaultValue?: number, range?: [number, number]) {
    const node = $(`<input style="width: 60px" type="number" placeholder="${placeholder}">`);

    if (defaultValue !== undefined) {
        node.attr("value", defaultValue);
    }

    if (range !== undefined) {
        node.attr("min", range[0]);
        node.attr("max", range[1]);
    }
    else {
        node.attr("min", 1);
    }

    return node;
}

export function makeCheckbox(label: string, initialState: boolean, onStateChange: (value: boolean) => void) {
    const node = $(`
        <label>
            <input type="checkbox" ${initialState ? "checked" : ""}>
            ${label}
        </label>
    `);

    node.find("input").on("change", function() {
        onStateChange(this.checked);
    });

    return node;
}

export function makeToggle(label: string, initialState: boolean, onStateChange: (value: boolean) => void) {
    const node = $(`
        <label class="switch setting is-rounded">
            <input type="checkbox" ${initialState ? "checked" : ""}>
            <span class="check"></span>
            <span class="control-label">
                <span aria-label="${label}">${label}</span>
            </span>
        </label>
    `);

    node.find("input").on("change", function() {
        onStateChange(this.checked);
    });

    return node;
}

export function makeSlider([min, max]: [number, number], initialState: number, onStateChange: (value: number) => void) {
    const node: JQuery<HTMLInputElement> = $(`
        <input type="range" min="${min}" max="${max}" value="${initialState}">
    `);

    node.on("input", function() {
        onStateChange(Number(this.value));
    });

    return node;
}

export function makeToggleableNumberInput(label: string, placeholder: string, state: { enabled: boolean, value?: number }) {
    const inputNode = makeNumberInput(placeholder, state.value)
        .on("change", function(this: HTMLInputElement) { state.value = this.value === "" ? undefined : Number(this.value); });

    const toggleNode = makeCheckbox(label, state.enabled, value => {
        inputNode.prop("disabled", !value);
        state.enabled = value;
    });

    inputNode.prop("disabled", !state.enabled);

    return $(`<div></div>`)
        .append(toggleNode)
        .append(inputNode);
}

function makeColorPickerTrigger(target: JQuery<HTMLElement>, overflow: number = 0) {
    const width = Number(target.attr("width"));
    const height = Number(target.attr("height"));

    const trigger = $(`<button></button>`)
        .css("position", "absolute")
        .css("padding", "0")
        .css("top", "0px")
        .css("left", `-${overflow}px`)
        .css("width", `${width + overflow * 2}px`)
        .css("height", `${height + overflow * 2}px`)
        .css("background", "transparent")
        .css("border", "none")
        .css("cursor", "pointer");

    return trigger;
}

function attachColorPickerTrigger(trigger: JQuery<HTMLElement>, target: JQuery<HTMLElement>) {
    target.parent().css("position", "relative");
    trigger.insertAfter(target);
}

const colorPickerCache: Record<string, [Pickr, JQuery<HTMLElement>]> = {};

export function makeColorPicker(
    target: JQuery<HTMLElement>,
    overflow: number,
    defaultColor: string,
    callbacks: {
        onChange: (value: string) => void,
        onSave: (value: string) => void,
        onCancel: () => void,
        currentColor: () => string
    }
) {
    let pickr: Pickr;
    let trigger: JQuery<HTMLElement>;

    // The Pickr instances are not destroyd on redraws, which leads to memory leaks
    // Reuse existing ones instead
    const cacheKey = `${target.attr("data-view")}/${target.attr("data-milestone")}`;
    if (cacheKey in colorPickerCache) {
        [pickr, trigger] = colorPickerCache[cacheKey];

        pickr.setColor(defaultColor, true);

        // The instance has callbacks from previous instantiation, clear them
        (pickr as any)._eventListener.hide = [];
        (pickr as any)._eventListener.save = [];
        (pickr as any)._eventListener.change = [];
    }
    else {
        trigger = makeColorPickerTrigger(target, overflow);

        pickr = new Pickr({
            container: "#analyticsPanel",
            el: trigger[0],

            useAsButton: true,
            position: "top-middle",

            theme: "classic",
            appClass: "color-picker",

            lockOpacity: true,
            default: defaultColor,

            swatches: Object.values(colorScheme),

            components: {
                palette: true,
                hue: true,
                interaction: {
                    input: true,
                    save: true
                }
            }
        });

        colorPickerCache[cacheKey] = [pickr, trigger];
    }

    pickr.on("hide", (instance: Pickr) => {
        if (instance.getColor().toHEXA().toString() !== callbacks.currentColor()) {
            instance.setColor(defaultColor);
            callbacks.onCancel();
        }
    });

    pickr.on("save", (value: Pickr.HSVaColor | null, instance: Pickr) => {
        const hex = value?.toHEXA().toString();
        if (hex !== undefined) {
            callbacks.onSave(hex);
        }
        instance.hide();
    });

    pickr.on("change", (value: Pickr.HSVaColor) => {
        callbacks.onChange(value.toHEXA().toString());
    });

    attachColorPickerTrigger(trigger, target);
}
