import { makeGraph, discardCachedState } from "../graph";
import type { ConfigManager, View } from "../../config";
import type { Game } from "../../game";
import type { HistoryEntry, HistoryManager } from "../../history";
import type { LatestRun } from "../../pendingRun";

import type { VNode } from "vue";

import html2canvas from "html2canvas";

async function copyToClipboard(node: HTMLElement) {
    const backgroundColor = $("html").css("background-color");

    const width = Math.round($(node).width()! + 10);
    const height = Math.round($(node).height()! + 10);

    const canvas = await html2canvas(node, {
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

type This = Vue & {
    game: Game,
    config: ConfigManager,
    view: View,
    history: HistoryManager,
    currentRun: LatestRun,
    selectedRun: HistoryEntry | null,
    plot: HTMLElement,
    timestamp: number | null,
    outdated: boolean,
    supportsRealTimeUpdates: boolean,
    redraw(): void,
    copyAsImage(): void,
    makeGraph(): HTMLElement
}

export default {
    inject: ["game", "config", "history", "currentRun"],
    props: ["view"],
    data() {
        return {
            selectedRun: null,
            plot: null,
            timestamp: null
        };
    },
    computed: {
        outdated(this: This) {
            return this.timestamp === null || (this.supportsRealTimeUpdates && this.timestamp !== this.game.day);
        },
        supportsRealTimeUpdates(this: This) {
            if (!this.config.recordRuns) {
                return false;
            }

            if (!this.config.active) {
                return false;
            }

            if (!this.view.active) {
                return false;
            }

            if (!this.view.includeCurrentRun) {
                return false;
            }

            if (this.view.mode === "records") {
                return false;
            }

            return true;
        }
    },
    methods: {
        redraw(this: This) {
            if (this.view.active && this.outdated) {
                this.plot = this.makeGraph();
                this.timestamp = this.game.day;
            }
        },
        makeGraph(this: This) {
            return makeGraph(this.history, this.view, this.game, this.currentRun, (run) => { this.selectedRun = run; });
        },
        async copyAsImage(this: This) {
            await copyToClipboard(this.plot);
        }
    },
    watch: {
        plot(this: This, newNode: HTMLElement, oldNode: HTMLElement | null) {
            if (oldNode !== null) {
                $(oldNode).replaceWith(newNode);
            }
            else {
                this.redraw();
            }
        },
        selectedRun(this: This) {
            this.$emit("select", this.selectedRun)
        },
        "config.active"(this: This) {
            this.redraw();
        },
        "config.openViewIndex"(this: This) {
            this.redraw();
        },
        "config.views"(this: This) {
            // The index doesn't always change when a view is removed
            this.redraw();
        },
        "history.runs"(this: This) {
            discardCachedState(this.view);
            this.selectedRun = null;
            this.redraw();
        },
        view: {
            handler(this: This) {
                discardCachedState(this.view);
                this.selectedRun = null;
                this.redraw();
            },
            deep: true
        },
        currentRun: {
            handler(this: This) {
                if (this.supportsRealTimeUpdates) {
                    this.redraw();
                }
            },
            deep: true
        }
    },
    directives: {
        plot: {
            inserted(element: HTMLElement, _: any, vnode: VNode) {
                const self = vnode.context as This;
                self.plot = element;
            }
        }
    },
    template: `
        <div v-plot></div>
    `
};
