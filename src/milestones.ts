import { resetName, buildings, buildingSegments, techs, events, environmentEffects } from "./enums";
import eventsInfo from "./events";
import { effectActive } from "./effects";
import { filterMap, patternMatch } from "./utils";
import type { milestoneTypes, resets, universes } from "./enums";
import type { Game } from "./game";

export type MilestoneChecker = {
    milestone: string,
    reached: () => boolean
}

export function makeMilestoneChecker(game: Game, milestone: string): MilestoneChecker | undefined {
    const impl = patternMatch(milestone, [
        [/built:(.+?)-(.+?):(\d+)/, (tab, id, count) => () => game.built(tab, id, Number(count))],
        [/tech:(.+)/, (id) => () => game.researched(id)],
        [/event:(.+)/, (id) => () => eventsInfo[id as keyof typeof events].triggered(game)],
        [/event_condition:(.+)/, (id) => () => eventsInfo[id as keyof typeof events].conditionMet?.(game) ?? true],
        [/effect:(.+)/, (id) => () => effectActive(id as keyof typeof environmentEffects, game)],
    ]);

    return {
        milestone,
        reached: impl ?? (() => false)
    };
}

type ResearchInfo = {
    type: "Research",
    name: string,
    suffix?: string
}

type BuildingInfo = {
    type: "Building",
    name: string,
    id: string,
    prefix?: string,
    suffix?: string,
    count: number
}

type OtherInfo = {
    type: string,
    name: string
}

type MilestoneNameInfo = OtherInfo | ResearchInfo | BuildingInfo;

function techName(id: string): ResearchInfo {
    const info = techs[id];
    return {
        type: "Research",
        name: info.name,
        suffix: info.suffix
    };
}

function buildingName(id: string, count: number): BuildingInfo {
    const info = buildings[id];
    return {
        type: "Building",
        name: info.name,
        id,
        prefix: info.prefix,
        suffix: info.suffix,
        count
    };
}

export function milestoneName(milestone: string, universe?: keyof typeof universes): MilestoneNameInfo {
    const name = patternMatch<MilestoneNameInfo>(milestone, [
        [/built:(.+?):(\d+)/, (id, count) => buildingName(id, Number(count))],
        [/tech:(.+)/, (id) => techName(id)],
        [/event:(.+)/, (id) => ({ type: "Event", "name": events[id as keyof typeof events] })],
        [/event_condition:(.+)/, (id) => ({ type: "Event Condition", "name": events[id as keyof typeof events] })],
        [/effect:(.+)/, (id) => ({ type: "Effect", name: environmentEffects[id as keyof typeof environmentEffects] })],
        [/reset:(.+)/, (reset) => ({ type: "Reset", name: resetName(reset as keyof typeof resets, universe) })],
    ]);

    return name ?? { type: "unknown", name: milestone };
}

function getDuplicates(entries: MilestoneNameInfo[]): Record<string, MilestoneNameInfo[]> {
    const grouped = Object.groupBy(entries, info => info.name) as Record<string, MilestoneNameInfo[]>;
    return filterMap(grouped, ([, group]) => group!.length !== 1);
}

function resolveDuplicateNames(entries: MilestoneNameInfo[]) {
    const steps = [
        // Step 1: Resolve non-buildings
        (group: MilestoneNameInfo[]) => {
            for (const entry of group) {
                if (entry.type !== "Building") {
                    const { type, name, suffix } = entry as any;
                    entry.name = `${name} (${suffix ?? type})`;
                }
            }
        },
        // Step 2: Add building prefixes
        (group: BuildingInfo[]) => {
            // If all prefixes are the same, adding them won't resolve duplicate names
            const regions = new Set(group.map(entry => entry.prefix));
            if (regions.size === 1) {
                return;
            }

            for (const entry of group) {
                const { name, prefix } = entry;
                if (prefix) {
                    entry.name = `${prefix} ${name}`;
                }
            }
        },
        // Step 3: Add building suffixes
        (group: BuildingInfo[]) => {
            for (const entry of group) {
                const { name, suffix } = entry;
                if (suffix) {
                    entry.name = `${name} (${suffix})`;
                }
            }
        },
        // Step 4: Add building counts
        (group: BuildingInfo[]) => {
            for (const entry of group) {
                const { id, count } = entry;
                entry.name = `${entry.name} (${count})`;

                // Don't add count twice - make equal to the default value
                entry.count = buildingSegments[id] ?? 1;
            }
        }
    ];

    for (const step of steps) {
        const duplicates = getDuplicates(entries);
        if (Object.entries(duplicates).length === 0) {
            return;
        }

        for (const group of Object.values(duplicates)) {
            step(group);
        }
    }
}

export function generateMilestoneNames(milestones: string[], universe?: keyof typeof universes): string[] {
    const entries = milestones.map(m => milestoneName(m, universe));

    resolveDuplicateNames(entries);

    // Final step: Add building counts if needed
    for (const entry of entries) {
        if (entry.type !== "Building") {
            continue;
        }

        const { id, count } = entry as BuildingInfo;

        if (count !== (buildingSegments[id] ?? 1)) {
            entry.name = `${entry.name} (${count})`;
        }
    }

    return entries.map(e => e.name);
}

export function milestoneType(milestone: string) {
    return milestone.slice(0, milestone.indexOf(":")) as keyof typeof milestoneTypes;
}
