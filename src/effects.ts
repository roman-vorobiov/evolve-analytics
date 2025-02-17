import colorScheme from "./enums/colorSchemes";
import type { environmentEffects } from "./enums";
import type { Game } from "./game";

export function effectActive(effect: keyof typeof environmentEffects, game: Game): boolean {
    switch (effect) {
        case "hot":
            return game.temperature === "hot";
        case "cold":
            return game.temperature === "cold";
        case "inspired":
            return game.inspired;
        case "motivated":
            return game.motivated;
        default:
            return false;
    }
}

export const effectColors: Record<string, string> = {
    "effect:hot": colorScheme.red,
    "effect:cold": colorScheme.blue,
    "effect:inspired": colorScheme.green,
    "effect:motivated": colorScheme.orange
}
