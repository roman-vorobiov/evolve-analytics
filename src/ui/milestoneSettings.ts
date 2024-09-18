import { makeAutocompleteInput, makeNumberInput, makeSelect, makeSlimButton } from "./utils";
import { buildings, techs, events } from "../enums";
import type { View } from "../config";
import type { Milestone } from "../milestones";

export function makeMilestoneSettings(view: View) {
    const builtTargetOptions = makeAutocompleteInput("Building/Project", buildings.map(([, , name], idx) => ({ value: String(idx), label: name })));
    const buildCountOption = makeNumberInput("Count", 1);

    const researchedTargetOptions = makeAutocompleteInput("Tech", techs.flatMap(([, ...names], idx) => names.map(name => ({ value: String(idx), label: name }))));

    const eventTargetOptions = makeSelect(events).css("width", "200px");

    function selectOptions(type: string) {
        builtTargetOptions.toggle(type === "Built");
        buildCountOption.toggle(type === "Built");
        researchedTargetOptions.toggle(type === "Researched");
        eventTargetOptions.toggle(type === "Event");
    }

    // Default form state
    selectOptions("Built");

    const typeOptions = makeSelect(["Built", "Researched", "Event"])
        .on("change", function(this: HTMLSelectElement) { selectOptions(this.value); });

    function makeMilestone(): Milestone | undefined {
        if (typeOptions.val() === "Built") {
            const info = buildings[Number(builtTargetOptions[0]._value)];
            if (info !== undefined) {
                const [tab, id, name] = info;
                return ["Built", tab, id, name, Number(buildCountOption.val()), true];
            }
        }
        else if (typeOptions.val() === "Researched") {
            const info = techs[Number(researchedTargetOptions[0]._value)];
            if (info !== undefined) {
                const [id, name] = info;
                return ["Researched", id, name, true];
            }
        }
        else if (typeOptions.val() === "Event") {
            const name = eventTargetOptions.val() as string;
            return ["Event", name, true]
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
