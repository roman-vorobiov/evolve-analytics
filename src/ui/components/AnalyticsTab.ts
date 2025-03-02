import type { ConfigManager, View } from "../../config";

import ViewTab from "./ViewTab";

import Vue from "vue";
import Sortable from "sortablejs";

type This = Vue & {
    config: ConfigManager,
    views: View[],
    index: number,
    addTab(): void,
    refreshTabsList(): Promise<void>
};

export default {
    components: {
        ViewTab
    },
    inject: ["config"],
    data(this: This) {
        return {
            index: this.config.openViewIndex,
            views: this.config.views
        }
    },
    watch: {
        async "config.views"(this: This) {
            // If the leftmost view got removed, the index doesn't change
            // but we still need to update it in order for the UI to swap tabs
            if (this.index === this.config.openViewIndex) {
                this.index = -1;
            }

            // Don't ask me why this works
            await Vue.nextTick();
            await Vue.nextTick();

            this.index = this.config.openViewIndex!;
        }
    },
    methods: {
        swapTabs(this: This, idx: number) {
            this.config.openViewIndex = idx;
            this.index = idx;
        },
        async refreshTabsList(this: This) {
            this.views = [];
            await Vue.nextTick();
            this.views = this.config.views;
            await Vue.nextTick();
        }
    },
    async mounted(this: This) {
        const tabsNode = $(this.$el).find(`> nav`);
        const tabsListNode = tabsNode.find("> ul");

        // The scrollbar is added to the <nav> element by default, which makes it appear under the line
        // and scrolling makes the whole tab list shift
        tabsNode.css("overflow-x", "hidden");
        tabsListNode.addClass(["hscroll", "w-full"]);

        // Scroll the tab list with the mouse wheel
        tabsListNode.on("wheel", (event) => {
            event.currentTarget.scrollLeft += (event.originalEvent as WheelEvent).deltaY;
        });

        // Add a "new tab" button as the last pseudo tab
        const addViewButton = $(`<li role="tab" id="add-view-btn" class="order-last"><a>+ Add tab</a></li>`)
            .on("click", () => this.config.addView())
            .appendTo(tabsListNode);

        // Make the tabs sortable
        Sortable.create(tabsListNode[0], {
            filter: "#add-view-btn",
            ghostClass: "has-text-warning",
            chosenClass: "has-text-warning",
            dragClass: "has-text-warning",
            animation: 150,
            onStart() {
                addViewButton.hide();
            },
            onEnd: async({ oldIndex, newIndex }) => {
                addViewButton.show();

                if (oldIndex !== newIndex) {
                    this.config.moveView(oldIndex! - 1, newIndex! - 1);
                    // Rearranging items in a list isn't properly handled by the b-tabs component - just remount it
                    await this.refreshTabsList();
                }
            }
        });
    },
    template: `
        <b-tabs :value="index" @input="swapTabs" class="resTabs">
            <view-tab v-for="view in views" :key="view.id" :view="view"/>
        </b-tabs>
    `
};
