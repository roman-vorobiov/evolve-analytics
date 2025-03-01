declare module "*.css";

declare module "buefy" {
    import type Vue from "vue";

    interface BTabItem extends Vue {
        index: number | null;
        label: string;
    }

    interface BTabs extends Vue {
        _registerItem(item: BTabItem): void;
    }
}
