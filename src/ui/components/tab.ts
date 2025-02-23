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
            return { btab: tabs };
        },
        mounted() {
            tabs.$slots.default.push(this.$children[0].$vnode);
        }
    });

    const original = tabs._registerItem;
    tabs._registerItem = (item: any) => {
        if (item.$options.propsData.label !== name) {
            original(item);
        }
    };

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
