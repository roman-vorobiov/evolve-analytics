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
