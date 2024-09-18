import { universes } from "../enums";
import { makeGraph } from "./graph";
import { makeViewSettings } from "./viewSettings";
import { makeMilestoneSettings } from "./milestoneSettings";
import type { ConfigManager, View } from "../config";
import type { HistoryManager } from "../history";

function viewTitle(view: View) {
    let title = view.resetType;
    if (view.universe !== undefined) {
        title += ` (${universes[view.universe as keyof typeof universes]})`;
    }

    return title;
}

export function makeViewTab(id: string, view: View, config: ConfigManager, history: HistoryManager) {
    const controlNode = $(`<li><a href="#${id}">${viewTitle(view)}</a></li>`);
    const contentNode = $(`<div id="${id}" class="vscroll" style="height: calc(100vh - 10rem)"></div>`);

    const removeViewNode = $(`<button class="button right" style="margin-right: 1em">Delete View</button>`).on("click", () => {
        config.removeView(view);
    });

    contentNode
        .append(makeViewSettings(view).css("margin-bottom", "1em"))
        .append(makeMilestoneSettings(view).css("margin-bottom", "1em"))
        .append(makeGraph(history, view))
        .append(removeViewNode);

    config.on("viewUpdated", view, (updatedView) => {
        controlNode.find("> a").text(viewTitle(updatedView));
        contentNode.find("figure:last").replaceWith(makeGraph(history, updatedView));
    });

    return [controlNode, contentNode];
}
