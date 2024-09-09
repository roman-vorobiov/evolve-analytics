import { resets } from "./enums";
import { game } from "./game";

export function getRunNumber(): number {
    return game.global.stats.reset + 1;
}

export function getDay(): number {
    return game.global.stats.days;
}

export function getUniverse(): string {
    return game.global.race.universe;
}

export function getResetCounts(): Record<string, number> {
    return Object.fromEntries(Object.entries(resets).map(([reset, name]) => [name, game.global.stats[reset] ?? 0]));
}

function onGameTick(fn: () => void) {
    let craftCost = game.craftCost;
    Object.defineProperty(game, "craftCost", {
        get: () => craftCost,
        set: (value) => {
            craftCost = value;
            fn();
        }
    });
}

export function onGameDay(fn: (day: number) => void) {
    let previousDay: number | null = null;
    onGameTick(() => {
        const day = getDay();

        if (previousDay !== day) {
            fn(day);
            previousDay = day;
        }
    });
}
