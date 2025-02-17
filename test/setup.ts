import { jest, beforeEach, afterEach } from "@jest/globals";
import { LocalStorageMock } from "./fixture";

beforeEach(() => {
    Object.defineProperty(global, "localStorage", {
        configurable: true,
        value: new LocalStorageMock()
    });
});

afterEach(() => {
    delete (global as any).localStorage;

    jest.clearAllMocks();
});
