const latestRun = {
    "run": 1,
    "universe": "standard",
    "resets": {
        "mad": 0,
        "bioseed": 0,
        "cataclysm": 0,
        "blackhole": 0,
        "ascend": 0,
        "descend": 0,
        "aiappoc": 0,
        "matrix": 0,
        "retire": 0,
        "eden": 0,
        "terraform": 0
    },
    "totalDays": 0,
    "milestones": {},
    "raceName": "Oompa Loompa"
};

function resetLatestRun() {
    localStorage.setItem("sneed.analytics.latest", JSON.stringify(latestRun));
}
