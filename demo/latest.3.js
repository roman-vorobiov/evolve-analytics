const latestRun = {
    run: 626,
    universe: "heavy",
    totalDays: 179,
    resets: {
        "MAD": 234,
        "Bioseed": 47,
        "Cataclysm": 2,
        "Black Hole": 17,
        "Ascension": 317,
        "Demonic Infusion": 3,
        "AI Apocalypse": 1,
        "Matrix": 1,
        "Retirement": 1,
        "Garden of Eden": 1,
        "Terraform": 1
    },
    milestones: {
        "Womlings arrival": 10,
        "Launch Facility": 96
    }
};

function resetLatestRun() {
    localStorage.setItem("sneed.analytics.latest", JSON.stringify(latestRun));
}
