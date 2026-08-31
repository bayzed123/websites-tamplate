# Adding a Demo

Create each client project as one folder directly under the repository root. Use a lowercase, URL-safe folder name such as `gadget-store-demo`, `skincare-demo`, or `admin-dashboard-demo`.

## Required frontend entry point

Every demo must contain an `index.html` file in one of the following locations:

| Location | Use case |
|---|---|
| `project/index.html` | A simple static frontend |
| `project/web/index.html` | A frontend paired with a worker or backend |
| `project/dist/index.html` | A pre-built frontend |
| `project/build/index.html` | A framework build output |
| `project/admin/index.html` | An admin-only demo |

If none of the preferred locations exists, the build script searches nested folders for the first `index.html` file. The folder is then shown automatically on the home page.

## What is copied

The workflow copies the complete demo folder into `site/demos/<project-folder>/`. This includes HTML, CSS, JavaScript, TypeScript, JSON, SVG, images, fonts, Markdown, SQL, configuration files, and other project assets. Relative URLs continue to work because the original directory structure is preserved. `.env` and `.env.local` files are intentionally excluded from the public artifact.

## Admin dashboard demos

An admin-only project is supported as a normal root folder. For example, put the dashboard entry point at `admin-dashboard-demo/index.html`, or use `admin-dashboard-demo/admin/index.html`. The generated card opens that entry point directly. Add a visible “Back to Demo Hub” link in the dashboard if you want clients to return to the catalog.

## Full-stack projects

GitHub Pages serves static files only. A full-stack demo can still show its frontend on Pages, but its API, database, authentication, payments, uploads, and worker must be deployed separately. Keep public frontend configuration in the demo folder and never commit secrets. Use the project's own backend deployment URL for API requests.

## Local commands

From the repository root, run the following command to create the same static artifact used by GitHub Actions:

```bash
node scripts/build-demo-hub.mjs site
```

Then serve the generated directory with any static server, for example:

```bash
python3 -m http.server 4173 --directory site
```

Open `http://localhost:4173/` in a browser. The build prints every discovered demo and its entry point. Add a folder, rerun the command, and confirm that its card appears before pushing.
