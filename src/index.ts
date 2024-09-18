import { synchronize } from "./evolve";
import { Game } from "./game";
import { getConfig } from "./config";
import { initializeHistory } from "./history";
import { processLatestRun, trackMilestones } from "./runTracking";
import { bootstrapAnalyticsTab } from "./ui";

const evolve = await synchronize();
const game = new Game(evolve);
const config = getConfig(game);
const history = initializeHistory(game);

processLatestRun(game, history);

trackMilestones(game, config);

bootstrapAnalyticsTab(config, history);
