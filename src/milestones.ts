import { buildings, techs, events, resets } from "./enums";
import { patternMatch } from "./utils";
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

export function milestoneName(milestone: string): [string, string] {
    const name: [string, string] | undefined = patternMatch(milestone, [
        [/built:(.+?):(\d+)/, (id, count) => [buildings[id], count]],
        [/tech:(.+)/, (id) => [techs[id], "Research"]],
        [/event:(.+)/, (id) => [events[id as keyof typeof events], "Event"]],
        [/reset:(.+)/, (reset) => [resets[reset as keyof typeof resets], "Reset"]]
    ]);

    return name ?? [milestone, "Unknown"];
}

export function generateMilestoneNames(milestones: string[]): string[] {
    const candidates: Record<string, [number, string][]> = {};

    for (let i = 0; i != milestones.length; ++i) {
        const [name, discriminator] = milestoneName(milestones[i]);
        (candidates[name] ??= []).push([i, discriminator]);
    }

    const names = new Array<string>(milestones.length);

    for (const [name, discriminators] of Object.entries(candidates)) {
        // The only milestone with this name - no need for disambiguation
        if (discriminators.length === 1) {
            names[discriminators[0][0]] = name;
        }
        else {
            for (const [i, discriminator] of discriminators) {
                names[i] = `${name} (${discriminator})`;
            }
        }
    }

    return names;
}
