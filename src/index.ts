import { migrate } from "./migration";
import { synchronize } from "./evolve";
import { Game } from "./game";
import { getConfig } from "./config";
import { initializeHistory } from "./history";
import { prepareCurrentRun } from "./pendingRun";
import { trackMilestones } from "./runTracking";
import { waitFocus } from "./utils";
import { bootstrapUIComponents } from "./ui";

migrate();

const evolve = await synchronize();
const game = new Game(evolve);

// The game may refresh after the evolution - wait until it is complete
await game.waitEvolved();

const config = getConfig(game);

const history = initializeHistory(game, config);

const currentRun = prepareCurrentRun(game, config, history);

trackMilestones(currentRun, game, config);

// Do not touch DOM when the tab is in the background
await waitFocus();

bootstrapUIComponents(game, config, history, currentRun);
