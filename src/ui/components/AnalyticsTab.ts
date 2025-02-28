import type { ConfigManager } from "../../config";

import ViewTab from "./ViewTab";

import Vue from "vue";

type This = Vue & {
    config: ConfigManager,
    duplicate: boolean,
    addTab(): void
};

export default {
    components: {
        ViewTab
    },
    inject: ["config"],
    methods: {
        addTab(this: This) {
            this.config.addView();

            // Vue doesn't notice this change - make sure the tabs updates its state
            Vue.nextTick(() => {
                this.config.openViewIndex = this.config.views.length;
            });
        }
    },
    mounted(this: This) {
        // The scrollbar is added to the <nav> element by default, which makes it appear under the line
        // and scrolling makes the whole tab list shift
        $(this.$el).find(`> nav`).css("overflow-x", "hidden");
        $(this.$el).find(`> nav > ul`).addClass(["hscroll", "w-full"]);

        // For some reason, BTabs fills the nav in the next tick
        Vue.nextTick(() => {
            const addViewButton = $(`<li role="tab" class="order-last"><a>+ Add tab</a></li>`)
                .on("click", () => this.addTab());

            $(this.$el).find("> nav > ul").append(addViewButton);
        });
    },
    template: `
        <b-tabs v-model="config.openViewIndex" class="resTabs">
            <template v-for="view in config.views">
                <view-tab :key="view.id" :view="view"/>
            </template>
        </b-tabs>
    `
};
