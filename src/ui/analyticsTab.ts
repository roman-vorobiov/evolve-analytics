import { makeViewTab } from "./viewTab";
import { lastChild } from "./utils";
import type { Game } from "../game";
import type { ConfigManager, View } from "../config";
import type { HistoryManager } from "../history";
import type { LatestRun } from "../runTracking";

export function buildAnalyticsTab(game: Game, config: ConfigManager, history: HistoryManager, currentRun: LatestRun) {
    const tabControlNode = $(`
        <li role="tab" aria-controls="analytics-content" aria-selected="true">
            <a id="analytics-label" tabindex="0" data-unsp-sanitized="clean">Analytics</a>
        </li>
    `);

    const tabContentNode = $(`
        <div class="tab-item" role="tabpanel" id="analytics" aria-labelledby="analytics-label" tabindex="0">
            <div id="analyticsPanel" class="tab-item">
                <nav class="tabs">
                    <ul role="tablist" class="hscroll" style="margin-left: 0; width: 100%">
                        <li><a id="analytics-add-view" role="button">+ Add View</a></li>
                    </ul>
                </nav>
            </div>
        </div>
    `);

    const analyticsPanel = tabContentNode.find("> #analyticsPanel").tabs({
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

    function hidden(node: JQuery) {
        return node.attr("tabindex") === "-1";
    }

    function hideTab(controlNode: JQuery, contentNode: JQuery, direction?: string) {
        controlNode.removeClass("is-active");
        controlNode.attr("aria-selected", "false");

        const hide = () => contentNode.css("display", "none").attr("tabindex", "-1");

        if (direction !== undefined) {
            contentNode.hide("slide", { direction, complete: hide }, 200);
        }
        else {
            hide();
        }
    }

    function showTab(controlNode: JQuery, contentNode: JQuery, direction: string) {
        controlNode.addClass("is-active");
        controlNode.attr("aria-selected", "true");

        const show = () => contentNode.css("display", "").attr("tabindex", "0");

        contentNode.show("slide", { direction, complete: show }, 200);
    }

    hideTab(tabControlNode, tabContentNode);

    // Note that there's a hidden "Hell Observations" tab after setting
    tabControlNode.insertBefore(lastChild($("#mainTabs > nav > ul")));
    tabContentNode.insertBefore(lastChild($("#mainTabs > section")));

    tabControlNode.siblings().on("click", function() {
        if (!hidden(tabContentNode)) {
            hideTab(tabControlNode, tabContentNode, "right");
            showTab($(this), tabContentNode.parent().children().eq($(this).index()), "left");
        }
    });

    tabControlNode.on("click", () => {
        hideTab(tabControlNode.siblings(), tabContentNode.siblings(), "left");
        showTab(tabControlNode, tabContentNode, "right");
    });

    for (const view of config.views) {
        addViewTab(view);
    }
    config.on("viewAdded", addViewTab);

    // Redraw each view whenever history is updated
    history.on("updated", () => {
        for (const view of config.views) {
            config.emit("viewUpdated", view);
        }
    });

    analyticsPanel.tabs({ active: config.openViewIndex ?? 0 });
}
