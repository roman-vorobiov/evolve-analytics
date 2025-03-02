export default {
    props: ["title", "customClass"],
    template: `
        <div class="modalBox">
            <p class="has-text-warning modalTitle">{{ title }}</p>
            <div id="specialModal" :class="'modalBody ' + customClass ?? ''">
                <slot/>
            </div>
        </div>
    `
};
