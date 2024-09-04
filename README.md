# Evolve Analytics

Inspired by Kewne's work on tracking milestones during runs, this userscript adds an "Analytics" tab to the evolve UI where you can see a breakdown of your evolve run times.

It does not require any other scripts to function.

## Run history

After installing the userscript, it starts tracking the run times and saving them to `localStorage`.

## Views

In the Analytics tab you can add and remove views that filter the run history based on reset type, universe, etc.

## Milestones

In addition to the total days, you can track milestones. Select the type, target and, optionally, count and click the `Add` or `Remove` buttons to add or remove a milestone to the view respecively. You don't need to add the milestone for the last research/building of a run (e.g. Ascension Machine) - it's added automatically and cannot be removed.

Each view has a separate set of milestones - the script only tracks milestones that are added to at least one view and does not infer the times for completed runs if one is added later. It will also stop tracking a milestone once it's removed from all views.

You can click on the names of the milestones on the legend above the graph to toggle them.

## View modes

The `Total` mode shows all milestones stacked on top of each other as parts of a single run. It also shows last run's times for each milestone on the right side of the graph.

Alternatively, the `Segmented` mode shows how many days it took to reach a milestone since the last one.
