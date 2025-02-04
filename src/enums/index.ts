export { buildings } from "./buildings";
export { segments as buildingSegments } from "./segments";
export { techs } from "./research";

export const events = {
    "womlings": "Womlings arrival",
    "steel": "Steel discovery",
    "elerium": "Elerium discovery",
    "oil": "Space Oil discovery",
    "pit": "Pit discovery",
    "alien": "Alien encounter",
    "piracy": "Piracy unlock",
    "alien_db": "Alien Database find",
    "corrupt_gem": "Corrupt Soul Gem creation",
    "vault": "Vault discovery",
    "syndicate": "Syndicate unlock"
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

export const viewModes = {
    "timestamp": "Timestamp",
    "duration": "Duration"
};

export const additionalInformation = {
    "raceName": "Race Name",
    "combatDeaths": "Combat Deaths",
    "junkTraits": "Junk Traits"
};

export function resetName(reset: keyof typeof resets, universe?: keyof typeof universes) {
    if (reset === "blackhole" && universe === "magic") {
        return "Vacuum Collapse";
    }
    else {
        return resets[reset];
    }
}
