import { makeAutocompleteInput, makeNumberInput, makeSelect, makeSlimButton } from "./utils";
import { buildings, techs, events, environmentEffects, milestoneTypes } from "../enums";
import type { View } from "../config";

export function makeMilestoneSettings(view: View) {
    const builtTargetOptions = makeAutocompleteInput("Building/Project", Object.entries(buildings).map(([id, name]) => ({ value: id, label: name })));
    const buildCountOption = makeNumberInput("Count", 1);

    const researchedTargetOptions = makeAutocompleteInput("Tech", Object.entries(techs).map(([id, name]) => ({ value: id, label: name })));

    const eventTargetOptions = makeSelect(Object.entries(events));

    const effectTargetOptions = makeSelect(Object.entries(environmentEffects));

    function selectOptions(type: string) {
        builtTargetOptions.toggle(type === "built");
        buildCountOption.toggle(type === "built");
        researchedTargetOptions.toggle(type === "tech");
        eventTargetOptions.toggle(type === "event");
        effectTargetOptions.toggle(type === "effect");
    }

    // Default form state
    selectOptions("built");

    const typeOptions = makeSelect(Object.entries(milestoneTypes))
        .on("change", function(this: HTMLSelectElement) { selectOptions(this.value); });

    function makeMilestone(): string | undefined {
        switch (typeOptions.val()) {
            case "built":
                return `built:${builtTargetOptions[0]._value}:${buildCountOption.val()}`;

            case "tech":
                return `tech:${researchedTargetOptions[0]._value}`;

            case "event":
                return `event:${eventTargetOptions.val()}`;

            case "effect":
                return `effect:${effectTargetOptions.val()}`;

            default:
                break;
        }
    }

    const addMilestoneNode = makeSlimButton("Add").on("click", () => {
        const milestone = makeMilestone();
        if (milestone !== undefined) {
            view.addMilestone(milestone);
        }
    });

    const removeMilestoneNode = makeSlimButton("Remove").on("click", () => {
        const milestone = makeMilestone();
        if (milestone !== undefined) {
            view.removeMilestone(milestone);
        }
    });

    return $(`<div style="display: flex; flex-direction: row; gap: 8px"></div>`)
        .append(typeOptions)
        .append(builtTargetOptions)
        .append(buildCountOption)
        .append(researchedTargetOptions)
        .append(eventTargetOptions)
        .append(effectTargetOptions)
        .append(addMilestoneNode)
        .append(removeMilestoneNode);
}
