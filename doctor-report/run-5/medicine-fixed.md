# Medicine result — run-5

## Doctor input

Read: /home/ubuntu/websites-tamplate/doctor-report/run-5/audit.md

## Applied medicine

The root build pipeline is the repair point for every demo. On the next build it will:

1. Discover every root project folder containing an HTML entry point.
2. Rewrite root-absolute local URLs to paths that work under the repository Pages subpath.
3. Resolve the root, product, and admin guide aliases to real demo files where available.
4. Inject a responsive **Demo pages** sidebar into every generated HTML page.
5. Preserve all file types and exclude only local secret environment files.
6. Rerun Playwright desktop/mobile checks before deployment.

## Audit input summary

Doctor reported zero broken internal links.
