import type { default as JQuery } from "jquery";
import "jqueryui";

declare const $: typeof JQuery;

export function waitFor(query: string) {
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

export function lastChild(node: JQuery) {
    const children = node.children();
    const length = children.length;
    return children[length - 1];
}

export function makeSelect(options: [string, string][], defaultValue?: string) {
    const optionNodes = options.map(([value, label]) => {
        return `<option value="${value}" ${value === defaultValue ? "selected" : ""}>${label}</option>`;
    });

    return $(`
        <select style="width: 100px">
            ${optionNodes}
        </select>
    `);
}

type AutocompleteOptions = {
    label: string,
    value: string
}

type AugmentedSelectElement = HTMLSelectElement & { _value: string | undefined }

export function makeAutocompleteInput(placeholder: string, options: AutocompleteOptions[]): JQuery<AugmentedSelectElement> {
    function onChange(event: Event, ui: JQueryUI.AutocompleteUIParams) {
        // If it wasn't selected from list
        if (ui.item === null){
            const item = options.find(({ label }) => label === this.value);
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
        source: options,
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

export function makeNumberInput(placeholder: string, defaultValue?: number) {
    const node = $(`<input style="width: 100px" type="number" placeholder="${placeholder}" min="1">`);

    if (defaultValue !== undefined) {
        node.attr("value", defaultValue);
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
