import { events } from "./enums";
import { transformMap, compose } from "./utils";
import type { Game } from "./game";

type EventInfo = {
    conditionMet?: (game: Game) => boolean
    triggered: (game: Game) => boolean
}

type ConditionDescription = {
    tech?: Record<string, number>,
    built?: Record<string, string[]>,
    demonKills?: number,
    womlingsArrived?: boolean,
    resourceUnlocked?: string
}

function makeCondition(description: ConditionDescription) {
    let impl = (game: Game) => true;

    if (description.tech !== undefined) {
        for (const [tech, level] of Object.entries(description.tech)) {
            impl = compose(impl, (game: Game) => game.techLevel(tech) >= level);
        }
    }

    if (description.built !== undefined) {
        for (const [tab, buildings] of Object.entries(description.built)) {
            impl = compose(impl, (game: Game) => buildings.some(b => game.built(tab, b, 1)))
        }
    }

    if (description.demonKills !== undefined) {
        impl = compose(impl, (game: Game) => game.demonKills() >= description.demonKills!)
    }

    if (description.womlingsArrived !== undefined) {
        impl = compose(impl, (game: Game) => game.womlingsArrived());
    }

    if (description.resourceUnlocked !== undefined) {
        impl = compose(impl, (game: Game) => game.resourceUnlocked(description.resourceUnlocked!));
    }

    return impl;
}

type EventDescription = {
    precondition?: ConditionDescription,
    postcondition: ConditionDescription
}

function makeEventsInfo(descriptions: Record<keyof typeof events, EventDescription>): Record<keyof typeof events, EventInfo> {
    return transformMap(descriptions, ([event, { precondition, postcondition }]) => {
        const triggered = makeCondition(postcondition);
        const conditionMet = precondition !== undefined ? makeCondition(precondition) : undefined;
        return [event, { conditionMet, triggered }];
    })
}

export default makeEventsInfo({
    womlings: {
        postcondition: { womlingsArrived: true }
    },
    steel: {
        postcondition: { resourceUnlocked: "Steel" }
    },
    elerium: {
        precondition: { tech: { "asteroid": 3 }, built: { space: ["iron_ship", "iridium_ship"] } },
        postcondition: { tech: { "asteroid": 4 } }
    },
    oil: {
        precondition: { tech: { "gas_moon": 1 }, built: { space: ["outpost"] } },
        postcondition: { tech: { "gas_moon": 2 } }
    },
    pit: {
        precondition: { tech: { "gateway": 1 }, demonKills: 1000000 },
        postcondition: { tech: { "hell_pit": 1 } }
    },
    alien: {
        precondition: { built: { galaxy: ["scout_ship"] } },
        postcondition: { tech: { "xeno": 1 } }
    },
    piracy: {
        precondition: { tech: { "xeno": 5 } },
        postcondition: { tech: { "piracy": 1 } }
    },
    alien_db: {
        precondition: { tech: { "conflict": 4 }, built: { galaxy: ["scavenger"] } },
        postcondition: { tech: { "conflict": 5 } }
    },
    corrupt_gem: {
        precondition: { tech: { "high_tech": 16 } },
        postcondition: { tech: { "corrupt": 1 } },
    },
    vault: {
        precondition: { tech: { "hell_ruins": 2 }, built: { portal: ["archaeology"] } },
        postcondition: { tech: { "hell_vault": 1 } }
    },
    syndicate: {
        precondition: { tech: { "outer": 1 } },
        postcondition: { tech: { "syndicate": 1 } }
    }
});
