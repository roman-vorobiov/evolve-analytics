import { resetName, buildings, buildingSegments, techs, events } from "./enums";
import { patternMatch } from "./utils";
import type { resets, universes } from "./enums";
import type { Game } from "./game";

export type MilestoneChecker = {
    milestone: string,
    reached: () => boolean
}

export function makeMilestoneChecker(game: Game, milestone: string): MilestoneChecker | undefined {
    const impl = patternMatch(milestone, [
        [/built:(.+?)-(.+?):(\d+)/, (tab, id, count) => () => game.built(tab, id, Number(count))],
        [/tech:(.+)/, (id) => () => game.researched(id)],
        [/event:womlings/, () => () => game.womlingsArrived()]
    ]);

    return {
        milestone,
        reached: impl ?? (() => false)
    };
}

export function milestoneName(milestone: string, universe?: keyof typeof universes): [string, string, boolean] {
    const name: [string, string, boolean] | undefined = patternMatch(milestone, [
        [/built:(.+?):(\d+)/, (id, count) => [buildings[id], count, Number(count) !== (buildingSegments[id] ?? 1)]],
        [/tech:(.+)/, (id) => [techs[id], "Research", false]],
        [/event:(.+)/, (id) => [events[id as keyof typeof events], "Event", false]],
        [/reset:(.+)/, (reset) => [resetName(reset as keyof typeof resets, universe), "Reset", false]]
    ]);

    return name ?? [milestone, "Unknown", false];
}

export function generateMilestoneNames(milestones: string[], universe?: keyof typeof universes): string[] {
    const candidates: Record<string, [number, string, boolean][]> = {};

    for (let i = 0; i !== milestones.length; ++i) {
        const [name, discriminator, force] = milestoneName(milestones[i], universe);
        (candidates[name] ??= []).push([i, discriminator, force]);
    }

    const names = new Array<string>(milestones.length);

    for (const [name, discriminators] of Object.entries(candidates)) {
        // Add a discriminator if there are multiple milestones with the same name
        // Or if the count of a "built" milestone differs from the segment number of the building
        if (discriminators.length > 1 || discriminators[0][2]) {
            for (const [i, discriminator] of discriminators) {
                names[i] = `${name} (${discriminator})`;
            }
        }
        else {
            names[discriminators[0][0]] = name;
        }
    }

    return names;
}

export function isEventMilestone(milestone: string) {
    return milestone.startsWith("event:");
}
