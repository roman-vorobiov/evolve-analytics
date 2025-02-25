import { makeGraph, discardCachedState } from "../graph";
import type { ConfigManager, View } from "../../config";
import type { Game } from "../../game";
import type { HistoryEntry, HistoryManager } from "../../history";
import type { LatestRun } from "../../runTracking";

import type { default as Vue, Ref } from "vue";

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
    active: Ref<boolean>,
    game: Game,
    config: ConfigManager,
    view: View,
    history: HistoryManager,
    currentRun: LatestRun,
    selectedRun: HistoryEntry | null,
    plot: HTMLElement,
    initialized(): boolean,
    supportsRealTimeUpdates(): boolean,
    redraw(): void,
    copyAsImage(): void
}

export default {
    inject: ["active", "game", "config", "history", "currentRun"],
    props: ["view"],
    data() {
        return {
            selectedRun: null,
            plot: null
        };
    },
    methods: {
        initialized(this: This) {
            return this.plot.localName !== "div";
        },
        supportsRealTimeUpdates(this: This) {
            if (!this.config.recordRuns) {
                return false;
            }

            if (!this.active.value) {
                return false;
            }

            if (!this.view.includeCurrentRun) {
                return false;
            }

            if (!this.view.active) {
                return false;
            }

            if (this.view.mode === "records") {
                return false;
            }

            return true;
        },
        redraw(this: This) {
            const plot = makeGraph(this.history, this.view, this.game, this.currentRun, (run) => {
                this.$emit("select", run);
            });

            $(this.plot).replaceWith(plot);
            this.plot = plot as HTMLElement;
        },
        async copyAsImage(this: This) {
            await copyToClipboard(this.plot);
        }
    },
    directives: {
        plot: {
            inserted(element: HTMLElement, _: any, vnode: any) {
                const self = vnode.context as This;

                self.plot = element;

                if (self.view.active) {
                    self.redraw();
                }
                else {
                    self.view.on("opened", () => {
                        if (!self.initialized()) {
                            self.redraw();
                        }
                    });
                }

                self.view.on("updated", () => {
                    discardCachedState(self.view);
                    self.$emit("select", null);
                    self.redraw();
                });

                self.history.on("updated", () => {
                    discardCachedState(self.view);
                    self.$emit("select", null);
                    self.redraw();
                });

                self.game.onGameDay(() => {
                    if (self.supportsRealTimeUpdates()) {
                        self.redraw();
                    }
                });
            }
        }
    },
    template: `
        <div v-plot></div>
    `
};
