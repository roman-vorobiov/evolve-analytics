import { migrate } from "./migration";
import { synchronize } from "./evolve";
import { Game } from "./game";
import { getConfig } from "./config";
import { initializeHistory } from "./history";
import { processLatestRun, trackMilestones } from "./runTracking";
import { waitFocus } from "./utils";
import { bootstrapUIComponents } from "./ui";

migrate();

const evolve = await synchronize();
const game = new Game(evolve);

// The game may refresh after the evolution - wait until it is complete
await game.waitEvolved();

const config = getConfig(game);

const history = initializeHistory(game, config);

// Commit the latest run to history or keep it
processLatestRun(game, config, history);

const currentRun = trackMilestones(game, config);

// Do not touch DOM when the tab is in the background
await waitFocus();

await bootstrapUIComponents(game, config, history, currentRun);
