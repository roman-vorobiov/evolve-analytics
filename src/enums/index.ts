export { buildings } from "./buildings";
export { segments as buildingSegments } from "./segments";
export { techs } from "./research";

export type Temperature = "hot" | "cold" | "normal"

export const events = {
    womlings: "Womlings arrival",
    steel: "Steel discovery",
    elerium: "Elerium discovery",
    oil: "Space Oil discovery",
    pit: "Pit discovery",
    alien: "Alien encounter",
    piracy: "Piracy unlock",
    alien_db: "Alien Database find",
    corrupt_gem: "Corrupt Soul Gem creation",
    vault: "Vault discovery",
    syndicate: "Syndicate unlock"
};

export const resets = {
    mad: "MAD",
    bioseed: "Bioseed",
    cataclysm: "Cataclysm",
    blackhole: "Black Hole",
    ascend: "Ascension",
    descend: "Demonic Infusion",
    apotheosis: "Apotheosis",
    aiappoc: "AI Apocalypse",
    matrix: "Matrix",
    retire: "Retirement",
    eden: "Garden of Eden",
    terraform: "Terraform"
};

export const universes = {
    standard: "Standard",
    heavy: "Heavy Gravity",
    antimatter: "Antimatter",
    evil: "Evil",
    micro: "Micro",
    magic: "Magic"
};

export const challengeGenes = {
    no_plasmid: "No Starting Plasmids",
    weak_mastery: "Weak Mastery",
    nerfed: "Weak Genes",
    no_crispr: "Junk Gene",
    badgenes: "Bad Genes",
    no_trade: "No Free Trade",
    no_craft: "No Manual Crafting"
};

export const environmentEffects = {
    hot: "Hot days",
    cold: "Cold days",
    inspired: "Inspired",
    motivated: "Motivated"
};

export const milestoneTypes = {
    built: "Built",
    tech: "Researched",
    event: "Event",
    effect: "Environment effect"
};

export const viewModes = {
    timestamp: "Timestamp",
    duration: "Duration",
    durationStacked: "Duration (stacked)",
};

export const additionalInformation = {
    raceName: "Race name",
    combatDeaths: "Combat deaths",
    junkTraits: "Junk traits"
};

export function resetName(reset: keyof typeof resets, universe?: keyof typeof universes) {
    if (reset === "blackhole" && universe === "magic") {
        return "Vacuum Collapse";
    }
    else {
        return resets[reset];
    }
}
