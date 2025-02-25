import styles from "./styles.css";
import { waitFor } from "./utils";
import type { Game } from "../game";
import type { ConfigManager } from "../config";
import type { HistoryManager } from "../history";
import type { LatestRun } from "../runTracking";

import AnalyticsTab from "./components/AnalyticsTab";

import type VueType from "vue";
import type { reactive, ref } from "vue";

declare const Vue: typeof VueType & { reactive: typeof reactive, ref: typeof ref };

type BTabItem = VueType & {
    index: number | null;
    $options: {
        propsData: {
            label: string
        }
    }
}

type BTabs = VueType & {
    _registerItem(item: BTabItem): void
}

type VueBoundElement<T extends VueType> = HTMLElement & { __vue__: T };

async function addAnalyticsTab(game: Game, config: ConfigManager, history: HistoryManager, currentRun: LatestRun) {
    const tabs = (await waitFor(`div#mainTabs`) as JQuery<VueBoundElement<BTabs>>)[0].__vue__;

    $("#mainTabs > .tab-content").append(`
        <b-tab-item label="Analytics">
            <analytics-tab-wrapper/>
        </b-tab-item>
    `);

    const AnalyticsTabWrapper = {
        components: {
            AnalyticsTab
        },
        inject: {
            config: { from: "config", default: null },
        },
        computed: {
            // See below
            duplicate() {
                return this.config === null;
            },
        },
        template: `
            <div v-if="!duplicate" id="mTabAnalytics">
                <analytics-tab/>
            </div>
        `
    };

    new Vue({
        el: "#mainTabs > .tab-content > :last-child",
        components: {
            AnalyticsTabWrapper
        },
        provide() {
            return {
                // BTabItem requires being compiled inside a BTabs component
                // It verifies this by injecting the parent via the btab prop - mock this dependency manually
                btab: tabs,

                game,
                config: Vue.reactive(config),
                history,
                currentRun
            };
        },
        mounted(this: BTabItem) {
            // Without this, the tabs component doesn't track the state properly
            tabs.$slots.default!.push(this.$children[0].$vnode);
        }
    });

    // For some reason, pushing a vnode to tabs.$slots causes the template to be compiled and mounted twice
    // Ignore consecutive inserts with of the same node
    const original = tabs._registerItem;
    tabs._registerItem = (item: BTabItem) => {
        if (item.$options.propsData.label !== "Analytics") {
            original(item);
        }
    };

    // Vanilla evolve does `global.settings.civTabs = $(`#mainTabs > nav ul li`).length - 1`
    // Replace the button with the mock click handler that assigns the correct tab index
    const observationButtons = await waitFor("button.observe");
    const text = observationButtons.first().text();

    const mockButton = $(`<button class="button observe right">${text}</button>`);
    mockButton.on("click", () => {
        ($("#mainColumn div:first-child") as JQuery<VueBoundElement<any>>)[0].__vue__.s.civTabs = 8;
    });

    observationButtons.replaceWith(mockButton);
}

async function addMainToggle(config: ConfigManager) {
    const lastToggle = await waitFor("#settings > .switch.setting:last");

    lastToggle.after(`
        <b-switch class="setting" id="analytics-master-toggle" v-model="config.recordRuns">
            Record Runs
        </b-switch>
    `);

    new Vue({
        el: "#analytics-master-toggle",
        data() {
            return {
                config: Vue.ref(config)
            };
        }
    });
}

function addStyles() {
    $("head").append(`<style type="text/css">${styles}</style>`);
}

export function bootstrapUIComponents(game: Game, config: ConfigManager, history: HistoryManager, currentRun: LatestRun) {
    addStyles();

    addMainToggle(config);

    addAnalyticsTab(game, config, history, currentRun);
}
