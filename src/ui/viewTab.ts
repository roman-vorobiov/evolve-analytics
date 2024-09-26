import { resets, universes } from "../enums";
import { weakFor, invokeFor, compose } from "../utils";
import { makeGraph } from "./graph";
import { makeViewSettings } from "./viewSettings";
import { makeMilestoneSettings } from "./milestoneSettings";
import { makeAdditionalInfoSettings } from "./additionalInfoSettings";
import type { ConfigManager, View } from "../config";
import type { HistoryEntry, HistoryManager } from "../history";

function viewTitle(view: View) {
    let title = resets[view.resetType];
    if (view.universe !== undefined) {
        title += ` (${universes[view.universe as keyof typeof universes]})`;
    }

    return title;
}

export function makeViewTab(id: string, view: View, config: ConfigManager, history: HistoryManager) {
    const controlNode = $(`<li><a href="#${id}">${viewTitle(view)}</a></li>`);
    const contentNode = $(`<div id="${id}" class="vscroll" style="height: calc(100vh - 10rem)"></div>`);

    const removeViewNode = $(`<button class="button right" style="margin-right: 1em">Delete View</button>`)
        .on("click", () => { config.removeView(view); });

    let selectedRun: HistoryEntry | null = null;

    const discardRunNode = $(`<button class="button" style="margin-right: 1em">Discard Run</button>`)
        .on("click", () => { history.discardRun(selectedRun!); })
        .hide();

    function onRunSelection(run: HistoryEntry | null) {
        selectedRun = run;
        discardRunNode.toggle(selectedRun !== null);
    }

    contentNode
        .append(makeViewSettings(view).css("margin-bottom", "1em"))
        .append(makeAdditionalInfoSettings(view).css("margin-bottom", "1em"))
        .append(makeMilestoneSettings(view).css("margin-bottom", "1em"))
        .append(makeGraph(history, view, onRunSelection))
        .append(discardRunNode)
        .append(removeViewNode);

    config.on("viewUpdated", compose([weakFor(view), invokeFor(view)], (updatedView) => {
        controlNode.find("> a").text(viewTitle(updatedView));
        contentNode.find("figure:last").replaceWith(makeGraph(history, updatedView, onRunSelection));
        onRunSelection(null);
    }));

    return [controlNode, contentNode];
}
