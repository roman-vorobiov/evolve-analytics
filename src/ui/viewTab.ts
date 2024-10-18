import { resets, universes } from "../enums";
import { weakFor, invokeFor, compose } from "../utils";
import { makeGraph } from "./graph";
import { makeViewSettings } from "./viewSettings";
import { makeMilestoneSettings } from "./milestoneSettings";
import { makeAdditionalInfoSettings } from "./additionalInfoSettings";
import { nextAnimationFrame } from "./utils";
import type { ConfigManager, View } from "../config";
import type { HistoryEntry, HistoryManager } from "../history";

import type { default as htmltoimage } from "html-to-image";

declare var htmlToImage: typeof htmltoimage;

async function withCSSOverrides<T>(overrides: Record<string, Record<string, string>>, callback: () => Promise<T>): Promise<T> {
    const overridesList = [];
    for (const [query, props] of Object.entries(overrides)) {
        const nodes = $(query);
        for (const [rule, value] of Object.entries(props)) {
            for (const node of nodes) {
                overridesList.push({ node, rule, original: node.style[rule as any], override: value });
            }
        }
    }

    for (const { node, rule, override } of overridesList) {
        $(node).css(rule, override);
    }

    const result = await callback();

    for (const { node, rule, original } of overridesList) {
        $(node).css(rule, original);
    }

    return result;
}

async function copyToClipboard(node: JQuery) {
    const isParent = (element: HTMLElement) => node.closest(element).length !== 0;
    const isChild = (element: HTMLElement) => $(element).closest(node).length !== 0;

    const cssOverrides = {
        "html": { width: "1000px", height: "550px" },
        "#mainColumn": { width: "100%" },
        ".vscroll": { height: "100%" },
        ".tab-item": { padding: "0" }
    };

    const blob = await withCSSOverrides(cssOverrides, () => {
        return htmlToImage.toBlob($("html")[0], {
            width: 1000,
            height: 550,
            skipFonts: true,
            filter: element => isParent(element) || isChild(element)
        });
    });

    await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob! })
    ]);
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

export function makeViewTab(id: string, view: View, config: ConfigManager, history: HistoryManager) {
    const controlNode = $(`<li><a href="#${id}">${viewTitle(view)}</a></li>`);
    const contentNode = $(`<div id="${id}" class="vscroll" style="height: calc(100vh - 10rem)"></div>`);

    const removeViewNode = $(`<button class="button">Delete View</button>`)
        .on("click", () => { config.removeView(view); });

    let selectedRun: HistoryEntry | null = null;

    const discardRunNode = $(`<button class="button">Discard Run</button>`)
        .on("click", () => { history.discardRun(selectedRun!); })
        .attr("disabled", "");

    const asImageNode = $(`<button class="button">Copy as PNG</button>`)
        .on("click", async function() {
            $(this).text("Rendering...");

            // For some reason awaiting htmlToImage.toBlob prevents UI from updating
            await nextAnimationFrame();

            const figure = contentNode.find("> figure");
            await copyToClipboard(figure);

            $(this).text("Copy as PNG");
        });

    function onRunSelection(run: HistoryEntry | null) {
        selectedRun = run;
        discardRunNode.attr("disabled", selectedRun === null ? "" : null);
    }

    const buttonsContainerNode = $(`<div style="display: flex; justify-content: space-between"></div>`)
        .append(asImageNode)
        .append(discardRunNode)
        .append(removeViewNode);

    contentNode
        .append(makeViewSettings(view).css("margin-bottom", "1em"))
        .append(makeAdditionalInfoSettings(view).css("margin-bottom", "1em"))
        .append(makeMilestoneSettings(view).css("margin-bottom", "1em"))
        .append(makeGraph(history, view, onRunSelection))
        .append(buttonsContainerNode);

    config.on("viewUpdated", compose([weakFor(view), invokeFor(view)], (updatedView) => {
        controlNode.find("> a").text(viewTitle(updatedView));
        contentNode.find("figure:last").replaceWith(makeGraph(history, updatedView, onRunSelection));
        onRunSelection(null);
    }));

    return [controlNode, contentNode];
}
