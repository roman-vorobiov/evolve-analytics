import { makeViewSettings } from "./viewSettings";
import { makeMilestoneSettings } from "./milestoneSettings";
import { makeGraph } from "./graph";
import { config } from "../../config";
import { universes } from "../../enums";
import type { View } from "../../view";

export function makeViewTab(view: View, id: string) {
    function generateTitle() {
        let title = view.resetType;
        if (view.universe !== undefined) {
            title += ` (${universes[view.universe as keyof typeof universes]})`;
        }

        return title;
    }

    const controlNode = $(`<li><a href="#${id}">${generateTitle()}</a></li>`);
    const contentNode = $(`<div id="${id}" class="vscroll" style="height: calc(100vh - 10rem)"></div>`);

    const removeViewNode = $(`<button class="button right" style="margin-right: 1em">Delete View</button>`).on("click", () => {
        config.removeView(view);
    });

    contentNode
        .append(makeViewSettings(view).css("margin-bottom", "1em"))
        .append(makeMilestoneSettings(view).css("margin-bottom", "1em"))
        .append(makeGraph(view))
        .append(removeViewNode);

    view.on("update", () => {
        controlNode.find("> a").text(generateTitle());
        contentNode.find("figure:last").replaceWith(makeGraph(view));
    });

    return [controlNode, contentNode];
}
