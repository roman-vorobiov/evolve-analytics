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

if (game.finishedEvolution) {
    const config = getConfig(game);
    const history = initializeHistory(game, config);

    processLatestRun(game, config, history);

    const currentRun = trackMilestones(game, config);

    if (!document.hidden) {
        bootstrapUIComponents(game, config, history, currentRun);
    }
    else {
        document.addEventListener("visibilitychange", function initializeUI() {
            if (!document.hidden) {
                document.removeEventListener("visibilitychange", initializeUI);
                bootstrapUIComponents(game, config, history, currentRun);
            }
        });
    }
}
