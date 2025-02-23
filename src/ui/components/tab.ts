import { waitFor } from "../utils";

type VueBoundElement = HTMLElement & { __vue__: any };

declare const Vue: any;

export async function addTab(name: string, factory: () => JQuery<HTMLElement>) {
    const tabID = `mTab${name}`;

    const tabs = (await waitFor(`div#mainTabs`) as JQuery<VueBoundElement>)[0].__vue__;

    // .sticky messes up tab transitions, replace it with .vscroll
    $("#settings").removeClass("sticky").addClass("vscroll");

    $("#mainTabs > .tab-content").append(`
        <b-tab-item label="${name}">
            <div id="${tabID}"></div>
        </b-tab-item>
    `);

    const tab = new Vue({
        el: "#mainTabs > .tab-content > :last-child",
        provide() {
            // BTabItem requires being compiled inside a BTabs component
            // It verifies this by injecting the parent via the btab prop - mock this dependency manually
            return { btab: tabs };
        },
        mounted() {
            // Without this, the tabs component doesn't track the state properly
            tabs.$slots.default.push(this.$children[0].$vnode);
        }
    });

    // For some reason, pushing a vnode to tabs.$slots causes the template to be compiled and mounted twice
    // Ignore consecutive inserts with of the same node
    const original = tabs._registerItem;
    tabs._registerItem = (item: any) => {
        if (item.$options.propsData.label !== name) {
            original(item);
        }
    };

    // tab.$children[0].index is not initialized yet
    Vue.nextTick(() => {
        const tabIndex = tab.$children[0].index;

        let initialized = false;
        tabs.$on("input", (idx: number) => {
            if (idx === tabIndex && !initialized) {
                $(`#${tabID}`).append(factory());
                initialized = true;
            }
        });
    });
}
