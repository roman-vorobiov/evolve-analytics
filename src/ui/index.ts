import styles from "./styles.css";
import { waitFor } from "./utils";
import { spy } from "../utils";
import { EvolveTabs } from "../evolve";
import type { Game } from "../game";
import type { ConfigManager } from "../config";
import type { HistoryManager } from "../history";
import type { LatestRun } from "../runTracking";

import AnalyticsTab from "./components/AnalyticsTab";

import { default as Vue, ref } from "vue";
import type { BTabs, BTabItem } from "buefy";

type VueBoundElement<T extends Vue> = HTMLElement & { __vue__: T };

function openTab(index: EvolveTabs) {
    ($("#mainColumn div:first-child") as JQuery<VueBoundElement<any>>)[0].__vue__.s.civTabs = index;;
}

async function addAnalyticsTab(game: Game, config: ConfigManager, history: HistoryManager, currentRun: LatestRun) {
    const tabs = (await waitFor(`div#mainTabs`) as JQuery<VueBoundElement<BTabs>>)[0].__vue__;

    $("#mainTabs > .tab-content").append(`
        <b-tab-item label="Analytics">
            <analytics-tab-wrapper ref="tab"/>
        </b-tab-item>
    `);

    const AnalyticsTabWrapper = {
        components: {
            AnalyticsTab
        },
        inject: {
            config: { from: "config", default: null },
        },
        data() {
            return {
                initialized: false
            };
        },
        computed: {
            // See below
            duplicate() {
                return this.config === null;
            },
        },
        methods: {
            activate() {
                this.config.active = true;
                this.initialized = true;
            },
            deactivate() {
                this.config.active = false;
            }
        },
        template: `
            <div v-if="!duplicate" id="mTabAnalytics">
                <analytics-tab v-if="initialized"/>
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
                config,
                history,
                currentRun
            };
        },
        mounted(this: BTabItem) {
            const tab = this.$refs.tab as any;

            spy(this.$children[0], "activate", () => tab.activate());
            spy(this.$children[0], "deactivate", () => tab.deactivate());

            // Without this, the tabs component doesn't track the state properly
            tabs.$slots.default!.push(this.$children[0].$vnode);

            // If the analytics tab was opened before, restore it
            if (config.active) {
                Vue.nextTick(() => openTab(EvolveTabs.Analytics));
            }
        }
    });

    // For some reason, pushing a vnode to tabs.$slots causes the template to be compiled and mounted twice
    // Ignore consecutive inserts with of the same node
    const original = tabs._registerItem;
    tabs._registerItem = (item: BTabItem) => {
        if (item.label !== "Analytics") {
            original(item);
        }
    };

    // Vanilla evolve does `global.settings.civTabs = $(`#mainTabs > nav ul li`).length - 1`
    // Replace the button with the mock click handler that assigns the correct tab index
    const observationButtons = await waitFor("button.observe");
    const text = observationButtons.first().text();

    const mockButton = $(`<button class="button observe right">${text}</button>`);
    mockButton.on("click", () => {
        openTab(EvolveTabs.HellObservations);
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
                config: ref(config)
            };
        }
    });
}

function addStyles() {
    $("head").append(`<style type="text/css">${styles}</style>`);
}

export async function bootstrapUIComponents(game: Game, config: ConfigManager, history: HistoryManager, currentRun: LatestRun) {
    addStyles();

    await addMainToggle(config);

    await addAnalyticsTab(game, config, history, currentRun);
}
