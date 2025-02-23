import { makeViewTab } from "./viewTab";
import { lastChild } from "./utils";
import type { Game } from "../game";
import type { ConfigManager, View } from "../config";
import type { HistoryManager } from "../history";
import type { LatestRun } from "../runTracking";

export function makeAnalyticsTab(game: Game, config: ConfigManager, history: HistoryManager, currentRun: LatestRun) {
    const analyticsPanel = $(`
        <div>
            <nav class="tabs">
                <ul role="tablist" class="hscroll" style="margin-left: 0; width: 100%">
                    <li><a id="analytics-add-view" role="button">+ Add View</a></li>
                </ul>
            </nav>
        </div>
    `);

    analyticsPanel.tabs({
        classes: {
            "ui-tabs-active": "is-active"
        }
    });

    analyticsPanel.find("#analytics-add-view").on("click", function() {
        config.addView();
    });

    function addViewTab(view: View) {
        const [controlNode, contentNode] = makeViewTab(game, view, config, history, currentRun);

        controlNode.on("click", () => {
            config.viewOpened(view);
        });

        function refresh() {
            analyticsPanel.tabs("refresh");
            analyticsPanel.tabs({ active: config.openViewIndex ?? 0 });
        }

        controlNode.insertBefore(lastChild(analyticsPanel.find("> nav > ul")));
        analyticsPanel.append(contentNode);
        refresh();

        config.on("viewRemoved", (removedView) => {
            if (removedView !== view) {
                return;
            }

            controlNode.remove();
            contentNode.remove();
            refresh();
        });
    }

    config.on("viewAdded", addViewTab);

    for (const view of config.views) {
        addViewTab(view);
    }

    analyticsPanel.tabs({
        active: config.openViewIndex ?? 0
    });

    return analyticsPanel;
}
