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
            container: "#mTabAnalytics",
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
