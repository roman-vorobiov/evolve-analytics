import type { Evolve } from "./evolve";

export function checkOldTech({ actions, global }: Evolve, tech: string) {
    let tch = actions.tech[tech]?.grant?.[0];
    if (global.tech[tch] && global.tech[tch] >= actions.tech[tech].grant[1]) {
        switch (tech) {
            case "fanaticism":
                return Boolean(global.tech["fanaticism"]);
            case "anthropology":
                return Boolean(global.tech["anthropology"]);
            case "deify":
                return Boolean(global.tech["ancient_deify"]);
            case "study":
                return Boolean(global.tech["ancient_study"]);
            case "isolation_protocol":
                return Boolean(global.tech["isolation"]);
            case "focus_cure":
                return Boolean(global.tech["focus_cure"]);
            case "vax_strat1":
                return Boolean(global.tech["vax_p"]);
            case "vax_strat2":
                return Boolean(global.tech["vax_f"]);
            case "vax_strat3":
                return Boolean(global.tech["vax_s"]);
            case "vax_strat4":
                return Boolean(global.tech["vax_c"]);
            default:
                return true;
        }
    }
    return false;
}
