import { promises as fs } from "fs";
import { createFilter } from "@rollup/pluginutils";
import typescript from "@rollup/plugin-typescript";
import tla from "rollup-plugin-tla";
import externalGlobals from "rollup-plugin-external-globals";

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

function preserveIndentation() {
    const filter = createFilter(["**/*.ts"], []);

    const indent = "    ";

    return {
        name: "preserveIndentation",
        transform(code, id) {
            if (filter(id)) {
                let lines = code.split("\n");
                let insideLiteral = false;

                lines = lines.map((line) => {
                    if (insideLiteral && line.length !== 0) {
                        line = indent + line;
                    }

                    if (line.split("`").length % 2 === 0) {
                        insideLiteral = !insideLiteral;
                    }

                    return line;
                });

                return lines.join("\n");
            }
        }
    };
}

export default {
    input: "src/index.ts",
    output: {
        file: "build/evolve_analytics.user.js",
        format: "iife",
        banner: async () => {
            const banner = await fs.readFile("evolve_analytics.meta.js", "utf-8");
            const prefix = await fs.readFile("evolve_analytics.prefix.js", "utf-8");
            return banner + "\n" + prefix;
        }
    },
    external: ["jqueryui"],
    plugins: [
        preserveIndentation(),
        typescript(),
        css(),
        tla(),
        externalGlobals({
            "vue": "Vue",
            "@observablehq/plot": "Plot",
            "lz-string": "LZString",
            "@simonwep/pickr": "Pickr",
            "fuzzysort": "fuzzysort",
            "html2canvas": "html2canvas",
            "sortablejs": "Sortable"
        })
    ],
    watch: {
        include: "src/**"
    }
};
