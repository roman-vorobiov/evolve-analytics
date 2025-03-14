import colorScheme from "../../enums/colorSchemes";

import { default as Pickr } from "@simonwep/pickr";

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

type PickrVTable = {
    onChange: (color: string) => void,
    onSave: (color: string) => void,
    onCancel: () => void,
    currentColor: () => string
}

// Reuse the same Pickr instance
let colorPickerInstance: [Pickr, JQuery<HTMLElement>] | null = null;
const vtable: PickrVTable & { defaultColor: string } = {} as any;

function getPickrInstance(): [Pickr, JQuery<HTMLElement>] {
    if (colorPickerInstance !== null) {
        return colorPickerInstance
    }

    const trigger = $(`<button></button>`);

    const pickr = new Pickr({
        container: "#mTabAnalytics > div.b-tabs > section.tab-content",
        el: trigger[0],

        useAsButton: true,
        position: "top-middle",

        theme: "classic",
        appClass: "color-picker",

        lockOpacity: true,

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

    let pending = false;

    pickr.on("show", () => {
        pending = true;
    });

    pickr.on("hide", (instance: Pickr) => {
        if (pending) {
            instance.setColor(vtable.defaultColor);
            vtable.onCancel();
            pending = false;
        }
    });

    pickr.on("save", (value: Pickr.HSVaColor | null, instance: Pickr) => {
        const hex = value?.toHEXA()?.toString();
        if (hex) {
            vtable.onSave(hex);
            pending = false;
        }
        instance.hide();
    });

    pickr.on("change", (value: Pickr.HSVaColor) => {
        vtable.onChange(value.toHEXA().toString());
    });

    return colorPickerInstance = [pickr, trigger];
}

export function makeColorPicker(target: JQuery<HTMLElement>, overflow: number, instanceCallbacks: PickrVTable) {
    const [pickr, trigger] = getPickrInstance();

    const wrapper = makeColorPickerTrigger(target, overflow).on("click", function() {
        const defaultColor = instanceCallbacks.currentColor();

        Object.assign(vtable, { ...instanceCallbacks, defaultColor });
        pickr.setColor(defaultColor, true);

        trigger.prop("style", $(this).attr("style"));
        trigger.insertAfter(target);

        trigger.trigger("click");
    });

    target.parent().css("position", "relative");
    wrapper.insertAfter(target);
}
