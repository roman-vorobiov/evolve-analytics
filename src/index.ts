import { migrate } from "./migration";
import { synchronize } from "./evolve";
import { Game } from "./game";
import { getConfig } from "./config";
import { initializeHistory } from "./history";
import { processLatestRun, trackMilestones } from "./runTracking";
import { bootstrapUIComponents } from "./ui";

migrate();

const evolve = await synchronize();
const game = new Game(evolve);
const config = getConfig(game);
const history = initializeHistory(game, config);

processLatestRun(game, config, history);

if (game.finishedEvolution) {
    trackMilestones(game, config);
}

bootstrapUIComponents(config, history);
