export default {
    transform: {
        "^.+\\.ts?$": "ts-jest"
    },
    setupFilesAfterEnv: ["./test/setup.ts"]
}
