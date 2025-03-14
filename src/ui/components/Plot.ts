import { applyFilters } from "../../exports/historyFiltering";
import { makeGraph } from "../graph";
import type { ConfigManager, View } from "../../config";
import type { Game } from "../../game";
import type { HistoryEntry, HistoryManager } from "../../history";
import type { LatestRun } from "../../pendingRun";

import type { default as Vue, VNode } from "vue";

type Selection = {
    top: number,
    left: number,
    milestone: string
}

function serializeMouseEvent(event: MouseEvent, milestone: string) {
    const container = $(`#mTabAnalytics > .b-tabs > section`);

    return {
        top: event.clientY + container.scrollTop()!,
        left: event.clientX + container.scrollLeft()!,
        milestone: milestone
    };
}

function restoreSelection(plot: HTMLElement, { top, left, milestone }: Selection) {
    const target = $(plot).find(`[data-milestone="${milestone}"]`);
    const container = $(`#mTabAnalytics > .b-tabs > section`);

    function makePointerEvent(name: string) {
        return new PointerEvent(name, {
            pointerType: "mouse",
            bubbles: true,
            composed: true,
            clientX: left - container.scrollLeft()!,
            clientY: top - container.scrollTop()!,
        });
    }

    target[0].dispatchEvent(makePointerEvent("pointerenter"));
    target[0].dispatchEvent(makePointerEvent("pointerdown"));
}

type This = Vue & {
    game: Game,
    config: ConfigManager,
    history: HistoryManager,
    currentRun: LatestRun,
    view: View,
    pendingSelection: Selection | null,
    pendingColorChange: { milestone: string, label: string, color: string } | null,
    plot: HTMLElement,
    timestamp: number | null,
    active: boolean,
    outdated: boolean,
    supportsRealTimeUpdates: boolean,
    redraw(force?: boolean): void,
    makeGraph(): HTMLElement
}

export default {
    inject: ["game", "config", "history", "currentRun"],
    props: ["view", "pendingColorChange"],
    data() {
        return {
            plot: null,
            timestamp: null,
            pendingSelection: null
        };
    },
    mounted(this: This) {
        this.history.watch(() => {
            this.$emit("select", null);
            this.pendingSelection = null;
            this.redraw(true);
        });

        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) {
                this.redraw();
            }
        });
    },
    computed: {
        active(this: This) {
            return this.config.active && this.view.active;
        },
        outdated(this: This) {
            return this.timestamp === null || (this.supportsRealTimeUpdates && this.timestamp !== this.game.day);
        },
        supportsRealTimeUpdates(this: This) {
            if (!this.config.recordRuns) {
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
        redraw(this: This, force = false) {
            if (!document.hidden && this.active && (force || this.outdated)) {
                this.plot = this.makeGraph();
                this.timestamp = this.game.day;
            }
        },
        makeGraph(this: This) {
            const filteredRuns = applyFilters(this.history, this.view);

            const plot = makeGraph(
                this.history,
                this.view,
                this.game,
                filteredRuns,
                this.currentRun,
                this.pendingColorChange
            );

            plot.addEventListener("mousedown", (event: MouseEvent) => {
                if (plot.value && plot.value.run < filteredRuns.length) {
                    this.pendingSelection = serializeMouseEvent(event, plot.value.milestone);
                    this.$emit("select", filteredRuns[plot.value.run]);
                }
                else {
                    this.pendingSelection = null;
                    this.$emit("select", null);
                }
            });

            return plot;
        }
    },
    watch: {
        plot(this: This, newNode: HTMLElement, oldNode: HTMLElement | null) {
            if (oldNode !== null) {
                $(oldNode).replaceWith(newNode);

                if (this.pendingSelection) {
                    restoreSelection(newNode, this.pendingSelection!);
                }
            }
            else {
                this.redraw();
            }
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
        view: {
            handler(this: This) {
                this.pendingSelection = null;
                this.$emit("select", null);
                this.redraw(true);
            },
            deep: true
        },
        currentRun: {
            handler(this: This) {
                this.redraw();
            },
            deep: true
        },
        pendingColorChange(
            this: This,
            newValue: { label: string, color: string } | null,
            oldValue: { milestone: string, label: string } | null
        ) {
            const label = newValue?.label ?? oldValue!.label;
            const color = newValue?.color ?? this.view.milestones[oldValue!.milestone].color;

            // It's faster than rerendering the whole graph
            $(this.plot).find(`[data-milestone="${label}"]`).each(function() {
                for (const attr of ["fill", "stroke"]) {
                    if ($(this).attr(attr) !== undefined) {
                        $(this).attr(attr, color);
                    }
                }
            });
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
