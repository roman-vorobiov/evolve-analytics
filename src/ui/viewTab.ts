import { resets, universes } from "../enums";
import { applyFilters } from "../exports/historyFiltering";
import { makeGraph, discardCachedState } from "./graph";
import { makeViewSettings } from "./viewSettings";
import { makeMilestoneSettings } from "./milestoneSettings";
import { makeAdditionalInfoSettings } from "./additionalInfoSettings";
import { nextAnimationFrame } from "./utils";
import type { Game } from "../game";
import type { ConfigManager, View } from "../config";
import type { HistoryEntry, HistoryManager } from "../history";
import type { LatestRun } from "../runTracking";

import type htmlTocanvas from "html2canvas";

declare var html2canvas: typeof htmlTocanvas;

async function copyToClipboard(node: JQuery) {
    const backgroundColor = $("html").css("background-color");

    const width = Math.round(node.width()! + 10);
    const height = Math.round(node.height()! + 10);

    const canvas = await html2canvas(node[0], {
        width,
        height,
        x: -10,
        y: -10,
        backgroundColor,
        logging: false
    });

    canvas.toBlob((blob) => {
        navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob! })
        ]);
    });
}

function viewTitle(view: View) {
    if (view.universe === "magic" && view.resetType === "blackhole") {
        return "Vacuum Collapse";
    }
    else {
        let title = resets[view.resetType];

        if (view.universe !== undefined) {
            title += ` (${universes[view.universe as keyof typeof universes]})`;
        }

        return title;
    }
}

export function makeViewTab(game: Game, view: View, config: ConfigManager, history: HistoryManager, currentRun: LatestRun) {
    const id = `analytics-view-${view.id()}`;
    const controlNode = $(`<li><a href="#${id}">${viewTitle(view)}</a></li>`);
    const contentNode = $(`<div id="${id}" class="vscroll" style="height: calc(100vh - 10rem)"></div>`);

    const removeViewNode = $(`<button class="button">Delete view</button>`)
        .on("click", () => { config.removeView(view); });

    let selectedRun: HistoryEntry | null = null;

    const ignoreRunsNode = $(`<button class="button">Ignore previous runs</button>`)
        .on("click", () => {
            const filteredRuns = applyFilters(history, view, { useLimits: false });
            const idx = filteredRuns.indexOf(selectedRun!);
            view.skipRuns = { enabled: true, value: idx };
        })
        .attr("disabled", "");

    const discardRunNode = $(`<button class="button">Discard run</button>`)
        .on("click", () => { history.discardRun(selectedRun!); })
        .attr("disabled", "");

    function onRunSelection(run: HistoryEntry | null) {
        selectedRun = run;

        if (selectedRun === null) {
            discardRunNode.attr("disabled", "");
            ignoreRunsNode.attr("disabled", "");
        }
        else {
            discardRunNode.attr("disabled", null);
            ignoreRunsNode.attr("disabled", null);
        }
    }

    function createGraph(view: View) {
        return makeGraph(history, view, game, currentRun, onRunSelection);
    }

    const asImageNode = $(`<button class="button">Copy as PNG</button>`)
        .on("click", async function() {
            $(this).text("Rendering...");

            // For some reason awaiting htmlToImage.toBlob prevents UI from updating
            await nextAnimationFrame();

            const figure = contentNode.find("> figure");
            await copyToClipboard(figure);

            $(this).text("Copy as PNG");
        });

    const buttonsContainerNode = $(`<div style="display: flex; justify-content: space-between"></div>`)
        .append(asImageNode)
        .append(ignoreRunsNode)
        .append(discardRunNode)
        .append(removeViewNode);

    contentNode
        .append(makeViewSettings(view))
        .append(makeAdditionalInfoSettings(view))
        .append(makeMilestoneSettings(view, history))
        .append(createGraph(view))
        .append(buttonsContainerNode);

    function redrawGraph(updatedView: View) {
        contentNode.find("figure:last").replaceWith(createGraph(updatedView));
    }

    view.on("updated", (updatedView) => {
        controlNode.find("> a").text(viewTitle(updatedView));
        discardCachedState(updatedView);
        redrawGraph(updatedView);
        onRunSelection(null);
    });

    history.on("updated", () => {
        discardCachedState(view);
        redrawGraph(view);
        onRunSelection(null);
    });

    game.onGameDay(() => {
        if (!config.recordRuns) {
            return;
        }

        if (!view.includeCurrentRun) {
            return;
        }

        if (view !== config.openView) {
            return;
        }

        if (view.mode === "records") {
            return;
        }

        redrawGraph(view);
    });

    return [controlNode, contentNode];
}
