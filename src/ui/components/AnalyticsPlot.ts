import { makeGraph, discardCachedState } from "../graph";
import type { ConfigManager, View } from "../../config";
import type { Game } from "../../game";
import type { HistoryEntry, HistoryManager } from "../../history";
import type { LatestRun } from "../../runTracking";

import type Vue from "vue";

import type htmlTocanvas from "html2canvas";

declare var html2canvas: typeof htmlTocanvas;

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
    supportsRealTimeUpdates: boolean,
    selectedRun: HistoryEntry | null,
    plot: HTMLElement
}

export default {
    inject: ["game", "config", "history", "currentRun"],
    props: ["view"],
    data() {
        return {
            selectedRun: null,
            plot: null
        };
    },
    computed: {
        supportsRealTimeUpdates(this: This) {
            if (!this.config.recordRuns) {
                return false;
            }

            if (!this.view.includeCurrentRun) {
                return false;
            }

            if (this.view !== this.config.openView) {
                return false;
            }

            if (this.view.mode === "records") {
                return false;
            }

            return true;
        }
    },
    directives: {
        plot: {
            inserted(element: HTMLElement, _: any, vnode: any) {
                const self = vnode.context as This;

                self.plot = element;

                function update() {
                    const newElement = makeGraph(self.history, self.view, self.game, self.currentRun, (run) => {
                        self.$emit("select", run);
                    });
                    $(self.plot).replaceWith(newElement);
                    self.plot = newElement as HTMLElement;
                }

                update();

                self.view.on("updated", () => {
                    discardCachedState(self.view);
                    self.$emit("select", null);
                    update();
                });

                self.history.on("updated", () => {
                    discardCachedState(self.view);
                    self.$emit("select", null);
                    update();
                });

                self.game.onGameDay(() => {
                    if (self.supportsRealTimeUpdates) {
                        update();
                    }
                });
            }
        }
    },
    methods: {
        copyAsImage(this: This) {
            copyToClipboard(this.plot);
        }
    },
    template: `
        <div v-plot></div>
    `
};
