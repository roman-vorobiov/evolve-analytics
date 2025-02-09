import type { environmentEffects } from "./enums";
import type { Game } from "./game";

export default <Record<keyof typeof environmentEffects, (game: Game) => boolean>> {
    "hot": (game) => game.temperature === "hot",
    "cold": (game) => game.temperature === "cold",
    "inspired": (game) => game.inspired,
    "motivated": (game) => game.motivated
};
