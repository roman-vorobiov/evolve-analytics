import { createFilter } from "@rollup/pluginutils";
import typescript from "@rollup/plugin-typescript";
import tla from "rollup-plugin-tla";
import externalGlobals from "rollup-plugin-external-globals";
import { promises as fs } from "fs";

function css() {
    const filter = createFilter(["**/*.css"], []);

    const indent = "    ";

    return {
        name: "css",
        transform(code, id) {
            if (filter(id)) {
                const indented = code.replace(/^(?!\s*$)/gm, indent.repeat(2));
                return `export default \`\n${indented}${indent}\`;`;
            }
        }
    };
}

export default (args) => {
    return {
        input: "src/index.ts",
        output: {
            file: "build/evolve_analytics.user.js",
            format: "iife",
            banner: async () => {
                const banner = await fs.readFile("evolve_analytics.meta.js", "utf-8");
                if (!args.configDebug) {
                    const prefix = await fs.readFile("evolve_analytics.prefix.js", "utf-8");
                    return banner + "\n" + prefix;
                }
                else {
                    return banner;
                }
            }
        },
        external: ["jqueryui"],
        plugins: [
            typescript(),
            css(),
            tla(),
            externalGlobals({
                "lz-string": "LZString",
                "@simonwep/pickr": "Pickr"
            })
        ],
        watch: {
            include: "src/**"
        }
    };
};
