import { applyCustonStyles } from "./styles"
import { makeViewTab } from "./viewTab"
import { lastChild } from "./utils"
import { getUniverse } from "../gameUtils";
import { config } from "../config";

import type { View } from "../view";

export function bootstrapAnalyticsTab() {
    applyCustonStyles();

    const tabControlNode = $(`
        <li role="tab" aria-controls="analytics-content" aria-selected="false">
            <a id="analytics-label" tabindex="0" data-unsp-sanitized="clean">Analytics</a>
        </li>
    `);

    const tabContentNode = $(`
        <div class="tab-item" role="tabpanel" id="analytics" aria-labelledby="analytics-label" tabindex="-1" style="display: none;">
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
        config.addView("Ascension", getUniverse());
    });

    function onViewAdded(view: View) {
        const controlParentNode = analyticsPanel.find("> nav > ul");
        const count = controlParentNode.children().length;
        const id = `analytics-view-${count}`;

        const [controlNode, contentNode] = makeViewTab(view, id);

        controlNode.insertBefore(lastChild(analyticsPanel.find("> nav > ul")));
        analyticsPanel.append(contentNode);
        analyticsPanel.tabs("refresh");
        analyticsPanel.tabs({ active: count - 1 });

        const cb = config.on("viewRemoved", removedView => {
            if (removedView === view) {
                config.unsubscribe(cb);

                controlNode.remove();
                contentNode.remove();
                analyticsPanel.tabs("refresh");
                analyticsPanel.tabs({ active: 0 });
            }
        });
    }

    function hidden(node: JQuery) {
        return node.attr("tabindex") === "-1";
    }

    function hideTab(controlNode: JQuery, contentNode: JQuery, direction: string) {
        controlNode.removeClass("is-active");
        controlNode.attr("aria-selected", "false");

        contentNode.hide("slide", { direction, complete: () => contentNode.css("display", "none").attr("tabindex", "-1") }, 200);
    }

    function showTab(controlNode: JQuery, contentNode: JQuery, direction: string) {
        controlNode.addClass("is-active");
        controlNode.attr("aria-selected", "true");

        contentNode.show("slide", { direction, complete: () => contentNode.css("display", "").attr("tabindex", "0") }, 200);
    }

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
        onViewAdded(view);
    }
    config.on("viewAdded", onViewAdded);

    analyticsPanel.tabs({ active: 0 });
}
