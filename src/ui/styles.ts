export function makeStyles() {
    return $(`
        <style type="text/css">
            html.dark .bg-dark {
                background: #181818
            }

            html.light .bg-dark {
                background: #dddddd
            }

            html.darkNight .bg-dark {
                background: #181818
            }

            html.gruvboxLight .bg-dark {
                background: #a89984
            }

            html.gruvboxDark .bg-dark {
                background: #1d2021
            }

            html.orangeSoda .bg-dark {
                background: #181818
            }

            html.dracula .bg-dark {
                background: #1a1c24
            }

            .w-fit {
                width: fit-content
            }

            .crossed {
                text-decoration: line-through
            }
        </style>
    `);
}
