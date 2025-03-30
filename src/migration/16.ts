import { makeRenamingMigration } from "./rename";

export const migrate16 = makeRenamingMigration(17, "eden-abandoned_throne", "eden-throne");
