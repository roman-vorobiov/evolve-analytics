import { makeAutocompleteInput, makeFlexContainer, makeNumberInput, makeSelect, makeSlimButton } from "./utils";
import { buildings, techs, events, environmentEffects, milestoneTypes } from "../enums";
import type { View } from "../config";
import type { HistoryManager } from "../history";

export function makeMilestoneSettings(view: View, history: HistoryManager) {
    const builtTargetOptions = makeAutocompleteInput("Building/Project", buildings);
    const buildCountOption = makeNumberInput("Count", 1);

    const researchedTargetOptions = makeAutocompleteInput("Tech", techs);

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
                if (builtTargetOptions[0]._value !== undefined) {
                    return `built:${builtTargetOptions[0]._value}:${buildCountOption.val()}`;
                }
                break;

            case "tech":
                if (researchedTargetOptions[0]._value !== undefined) {
                    return `tech:${researchedTargetOptions[0]._value}`;
                }
                break;

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

    const reorderMilestonesNode = makeSlimButton("Auto sort").on("click", () => {
        view.sortMilestones(history);
    });

    const recolorMilestonesNode = makeSlimButton("Reset colors").on("click", () => {
        view.resetColors();
    });

    const container = makeFlexContainer("row")
        .css("margin-bottom", "1em")

    container
        .append(typeOptions)
        .append(builtTargetOptions)
        .append(buildCountOption)
        .append(researchedTargetOptions)
        .append(eventTargetOptions)
        .append(effectTargetOptions)
        .append(addMilestoneNode)
        .append(removeMilestoneNode)
        .append(reorderMilestonesNode)
        .append(recolorMilestonesNode);

    return container;
}
