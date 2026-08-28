# Veloura Atelier SmartGen Demo

Veloura Atelier is an isolated, separately branded e-commerce demonstration project for prospective clients. It reproduces the complete storefront and admin operating experience of the reference commerce build while using fictional products, customers, orders, analytics, messages, and operational records.

## Demo boundary

This project is non-production. It must not be connected to the delivered Rinova repository, a live customer database, a real payment account, a real courier account, a production Google Analytics property, or a production Cloudflare resource. The `worker/wrangler.toml` file intentionally contains demo placeholders for D1, KV, R2, Google Sheets, and analytics identifiers. Replace those placeholders only with newly created demo resources when deploying.

## What prospective clients can explore

The public experience includes the home page, category browsing, product detail, bag, checkout, printable invoice, order tracking, customer account, journal, responsive navigation, and the storefront SmartGen support surface. The admin experience includes overview metrics, catalogue editing, inventory, orders, returns, POS and barcode labels, content management, marketing banners, traffic and SEO, settings, notifications, safe demo actions, and the admin SmartGen assistant with its floating launcher and popup interface.

All visible actions are intended for test exploration. No real payment is captured, no real courier shipment is created, and no production customer or order is read or changed.

## Demo access

For a deployed demo, provision a dedicated admin owner through the deployment secret `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Suggested fictional credentials are `demo-admin@velouraatelier.example` and `Demo-Only-2026!`; rotate them before sharing the preview URL publicly. Never reuse a production password.

The storefront does not require an account for browsing. Use clearly fictional contact details at checkout, such as `demo.customer@example.test` and `+8801700000000`. Any order created in the demo is test data only.

## Local development

Install dependencies and run the storefront build with:

```bash
npm install
npm run build
npm run typecheck
```

The Worker runs with Wrangler using a newly created demo D1 database and KV namespace. Do not point `worker/wrangler.toml` at a production account. A deployment must be configured separately for this demo project; it is not an instruction to deploy the completed client site.

## Branding and assets

The demo brand is **Veloura Atelier**, with a warm ivory, muted rose, plum, and champagne visual system. Product imagery must be newly generated or otherwise licensed for the demo. No production product images, logos, customer records, analytics identifiers, service-account JSON, API keys, or courier credentials belong in this repository.

## Integration posture

Google Analytics, Search Console, Google Sheets, courier APIs, R2, and payment services are intentionally non-production placeholders or disconnected by default. The admin UI may display setup states so a prospective client can understand the integration surface without receiving access to live data. Any future integration must use a dedicated demo account, a least-privilege credential, and a test-only resource.

## Source relationship

The original client repository is used only as a reference for feature coverage and layout patterns. It is not a dependency, submodule, runtime endpoint, data source, or deployment target for this project.
