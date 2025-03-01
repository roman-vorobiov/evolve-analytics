import type { ConfigManager } from "../../config";

import ViewTab from "./ViewTab";

import Vue from "vue";

type This = Vue & {
    config: ConfigManager,
    index: number,
    addTab(): void
};

export default {
    components: {
        ViewTab
    },
    inject: ["config"],
    data(this: This) {
        return {
            index: this.config.openViewIndex
        }
    },
    watch: {
        async "config.views"(this: This) {
            // If the leftmost view got removed, the index doesn't change
            // but we still need to update it in order for the UI to swap tabs
            if (this.index === this.config.openViewIndex) {
                this.index = -1;
            }

            // Still need to wait 1 tick for some reason
            await Vue.nextTick();
            this.index = this.config.openViewIndex!;
        }
    },
    methods: {
        swapTabs(this: This, idx: number) {
            this.config.openViewIndex = idx;
            this.index = idx;
        }
    },
    mounted(this: This) {
        // The scrollbar is added to the <nav> element by default, which makes it appear under the line
        // and scrolling makes the whole tab list shift
        $(this.$el).find(`> nav`).css("overflow-x", "hidden");
        $(this.$el).find(`> nav > ul`).addClass(["hscroll", "w-full"]);

        const addViewButton = $(`<li role="tab" class="order-last"><a>+ Add tab</a></li>`)
            .on("click", () => this.config.addView());

        $(this.$el).find("> nav > ul").append(addViewButton);
    },
    template: `
        <b-tabs :value="index" @input="swapTabs" class="resTabs">
            <view-tab v-for="view in config.views" :key="view.id" :view="view"/>
        </b-tabs>
    `
};
