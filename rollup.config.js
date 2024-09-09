import typescript from "@rollup/plugin-typescript";
import tla from "rollup-plugin-tla";
import { promises as fs } from "fs";

export default {
    input: "src/index.ts",
    output: {
        file: "build/evolve_analytics.user.js",
        format: "iife",
        banner: () => fs.readFile("src/meta.js", "utf-8")
    },
    external: ["jqueryui"],
    plugins: [typescript(), tla()],
    watch: {
        include: "src/**"
    }
};
