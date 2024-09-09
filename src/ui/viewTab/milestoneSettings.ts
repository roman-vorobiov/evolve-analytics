import { makeAutocompleteInputNode, makeNumberInput, makeSelectNode, makeSlimButtonNode } from "../utils";
import { buildings, techs, events } from "../../enums";
import { Building, Research, EvolveEvent } from "../../milestones";
import type { View } from "../../view";

export function makeMilestoneSettings(view: View) {
    const builtTargetOptions = makeAutocompleteInputNode("Building/Project", buildings.map(([, , name], idx) => ({ value: String(idx), label: name })));
    const buildCountOption = makeNumberInput("Count", 1);

    const researchedTargetOptions = makeAutocompleteInputNode("Tech", techs.flatMap(([, ...names], idx) => names.map(name => ({ value: String(idx), label: name }))));

    const eventTargetOptions = makeSelectNode(events).css("width", "200px");

    function selectOptions(type: string) {
        builtTargetOptions.toggle(type === "Built");
        buildCountOption.toggle(type === "Built");
        researchedTargetOptions.toggle(type === "Researched");
        eventTargetOptions.toggle(type === "Event");
    }

    // Default form state
    selectOptions("Built");

    const typeOptions = makeSelectNode(["Built", "Researched", "Event"])
        .on("change", function(this: HTMLSelectElement) { selectOptions(this.value); });

    function makeMilestone() {
        if (typeOptions.val() === "Built") {
            const infoIdx = builtTargetOptions[0]._value;
            return infoIdx && new (Building as any)(...buildings[Number(infoIdx)], Number(buildCountOption.val()));
        }
        else if (typeOptions.val() === "Researched") {
            const infoIdx = researchedTargetOptions[0]._value;
            return infoIdx && new (Research as any)(...techs[Number(infoIdx)]);
        }
        else if (typeOptions.val() === "Event") {
            return new (EvolveEvent as any)(eventTargetOptions.val());
        }
    }

    const addMilestoneNode = makeSlimButtonNode("Add").on("click", () => {
        const milestone = makeMilestone();
        if (milestone !== undefined) {
            view.addMilestone(milestone);
        }
    });

    const removeMilestoneNode = makeSlimButtonNode("Remove").on("click", () => {
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
