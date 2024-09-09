import { updateHistory, trackMilestones } from "./runTracking";
import { bootstrapAnalyticsTab } from "./ui/analyticsTab";

// The game refreshes the page after a reset
// Thus the script initialization can be a place to update the history
updateHistory();

trackMilestones();

bootstrapAnalyticsTab();
