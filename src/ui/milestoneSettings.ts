import { makeAutocompleteInput, makeNumberInput, makeSelect, makeSlimButton } from "./utils";
import { buildings, techs, events } from "../enums";
import type { View } from "../config";

export function makeMilestoneSettings(view: View) {
    const builtTargetOptions = makeAutocompleteInput("Building/Project", Object.entries(buildings).map(([id, name]) => ({ value: id, label: name })));
    const buildCountOption = makeNumberInput("Count", 1);

    const researchedTargetOptions = makeAutocompleteInput("Tech", Object.entries(techs).map(([id, name]) => ({ value: id, label: name })));

    const eventTargetOptions = makeSelect(Object.entries(events));

    function selectOptions(type: string) {
        builtTargetOptions.toggle(type === "built");
        buildCountOption.toggle(type === "built");
        researchedTargetOptions.toggle(type === "tech");
        eventTargetOptions.toggle(type === "event");
    }

    // Default form state
    selectOptions("built");

    const typeOptions = makeSelect([["built", "Built"], ["tech", "Researched"], ["event", "Event"]])
        .on("change", function(this: HTMLSelectElement) { selectOptions(this.value); });

    function makeMilestone(): string | undefined {
        if (typeOptions.val() === "built") {
            return `built:${builtTargetOptions[0]._value}:${buildCountOption.val()}`;
        }
        else if (typeOptions.val() === "tech") {
            return `tech:${researchedTargetOptions[0]._value}`;
        }
        else if (typeOptions.val() === "event") {
            return `event:${eventTargetOptions.val()}`;
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
        .append(`<span>Milestone</span>`)
        .append(typeOptions)
        .append(builtTargetOptions)
        .append(buildCountOption)
        .append(researchedTargetOptions)
        .append(eventTargetOptions)
        .append(addMilestoneNode)
        .append(removeMilestoneNode);
}
