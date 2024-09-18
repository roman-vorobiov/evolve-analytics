import type { Game } from "./game";

export type BuiltMilestone = ["Built", /*tab*/ string, /*id*/ string, /*name*/ string, /*count*/ number];
export type ResearchedMilestone = ["Researched", /*id*/ string, /*name*/ string];
export type EventMilestone = ["Event", /*name*/ string];
export type ResetMilestone = ["Reset", /*name*/ string];

export type Milestone = [...(BuiltMilestone | ResearchedMilestone | EventMilestone | ResetMilestone), /*enabled*/ boolean];

export type MilestoneChecker = {
    name: string,
    reached: () => boolean
}

export function milestoneType(milestone: Milestone) {
    return milestone[0];
}

export function milestoneEnabled(milestone: Milestone) {
    return milestone[milestone.length - 1] as boolean;
}

export function milestoneName(milestone: Milestone): string {
    if (milestone[0] === "Built") {
        return milestone[3];
    }
    else if (milestone[0] === "Researched") {
        return milestone[2];
    }
    else if (milestone[0] === "Event") {
        return milestone[1];
    }
    else if (milestone[0] === "Reset") {
        return milestone[1];
    }
    else {
        return "Unknown";
    }
}

export function makeMilestoneChecker(game: Game, milestone: Milestone): MilestoneChecker | undefined {
    if (milestone[0] === "Built") {
        const [, tab, id, name, count] = milestone;

        return {
            name,
            reached: () => game.built(tab, id, count)
        };
    }
    else if (milestone[0] === "Researched") {
        const [, id, name] = milestone;

        return {
            name,
            reached: () => game.researched(id)
        };
    }
    else if (milestone[0] === "Event") {
        const [, name] = milestone;

        const impl = {
            "Womlings arrival": () => game.womlingsArrived()
        };

        return {
            name,
            reached: impl[name as keyof typeof impl] ?? (() => false)
        };
    }
}
