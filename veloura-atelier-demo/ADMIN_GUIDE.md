# Veloura Atelier Demo Admin Guide

## Safe exploration first

This dashboard is a client-demo workspace. Every product, customer, order, return, review, notification, metric, and message is fictional. Use the demo admin credentials configured for this deployment and do not enter production credentials, real customer information, or real payment details.

## Dashboard tour

The **Overview** view presents sample revenue, gross profit, order, stock, and average-order-value cards together with the operational checklist. The period controls are safe to change because they read demo records only.

The **Catalogue** area demonstrates product creation, editing, archiving, category assignment, pricing, media, badges, and search. The **Inventory** area demonstrates stock adjustments, reasons, movement history, low-stock review, and valuation. Use fictional quantities such as 5 or 20 when testing.

The **Orders** area demonstrates order search, status transitions, invoice printing, and fulfilment notes. The **Returns** area demonstrates return status review. The **POS & Barcodes** area demonstrates quick-sale cart building, discount calculation, and printable label selection. These flows do not charge a card or contact a courier.

The **Content CMS** area demonstrates editable banners, pages, journal posts, metadata, publish state, and media fields. The **Marketing** area demonstrates campaign banners, newsletter leads, and export controls. The **Traffic & SEO** area shows sample analytics and setup states rather than live customer tracking. The **Settings** view demonstrates store profile, delivery, tax, contact, and integration settings. **Notifications** demonstrates unread/read state and admin activity messages.

## SmartGen assistants

The storefront assistant is a support surface for shoppers and responds with demo-safe product, delivery, checkout, and order-tracking guidance. The admin assistant is intentionally separated from the storefront assistant. It opens from a floating circular launcher at the bottom-right and expands into a popup without changing dashboard layout. Use it to ask about sample stock, orders, returns, sales, and daily checks.

## Resetting the demo

If a deployment needs a clean state, recreate the dedicated demo D1 database and rerun only the demo migration/seed workflow. Never restore or import the delivered Rinova database. If a prospective client enters personal information accidentally, remove the demo database rather than retaining it.

## Sharing the preview

Share the demo URL together with the README safety notice and a disposable admin account. State clearly that integrations, analytics, payments, courier actions, and transactions are simulated or disconnected. Rotate the demo password after a client session and before sending access to another client.
