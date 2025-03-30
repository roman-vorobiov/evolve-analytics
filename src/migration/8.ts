import { makeRenamingMigration } from "./rename";

export const migrate8 = makeRenamingMigration(9, "harbour", "harbor");
