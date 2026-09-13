# Sidra Clothing & Shoes

Welcome to Sidra Clothing & Shoes, the ultimate destination for fashion enthusiasts seeking a sophisticated online shopping experience. This is the project I have made completely alone with my current React.js skills. I created this project for my college exam and also because I wanted to test my current web development skills. Sidra Clothing & Shoes is an innovative e-commerce platform offering a diverse range of clothing and footwear. With a catalog of over a hundred products, my online shop is designed to cater to the varied tastes and preferences of our customers. The website is equipped with user-friendly features to ensure a seamless shopping experience. This repository is home to a comprehensive React.js eCommerce project, showcasing a refined and responsive shopping platform 
tailored for the trendy and style-savvy.

# Introduction
Sidra Clothing & Shoes is a fashion eCommerce website design that's built with the modern consumer in mind. Leveraging the power of React.js, I've created an engaging and intuitive platform that stands out in the digital marketplace. My project demonstrates how eCommerce and fashion can merge seamlessly in a digital ecosystem, providing an exceptional user experience from homepage to checkout.

# Project Features
- React Ecommerce Frontend: A modern and clean interface that highlights our product catalog with elegance and style.
- React Ecommerce Filter: An easy-to-use filtering system that allows customers to sort products by category, price, and more.
- Ecommerce React Website: A full-featured website built on React that exemplifies best practices in web development and design.
- React Shopping App: More than just a website, a complete shopping application designed for seamless online transactions.

# Customization and Templates
- React Online Shop Template: Utilize my pre-designed templates as a solid foundation for creating your unique online shop.
- React Ecommerce Theme: My custom theme embodies the latest trends in web aesthetics, providing a chic backdrop for your merchandise.
- Free React Ecommerce Template: Jumpstart your project with my free template that offers a balance of design and functionality.

# Development Highlights
- Ecommerce Using React: My codebase showcases how React can be leveraged to build dynamic and responsive eCommerce sites.
- React Ecommerce App: The structure of the application is designed to serve as a robust React eCommerce platform.
- React Ecommerce Boilerplate: Developers can use this project as a boilerplate, enjoying a pre-configured environment that accelerates development cycles.

# Instructions
1. To run the app you first need to downlod and install Node.js and npm on your computer. When you download them you need to configure path variables. Here is the link where you can install them: https://nodejs.org/en
2. When you install Node.js and npm on your computer you need to download the project. When you download the project, you need first to open the first terminal and write: npm install
3. After that in the same terminal write: npm run dev
4. The third step is mandatory if you don't have json-server installed on your computer. Open a second terminal write the following: npm install -g json-server
5. When you do it, you need to open second terminal and run JSON server on port 8080. Just write in the second terminal: json-server --watch src/data/db.json --port 8080

# Have problems while running the app? Here is the recorded video instruction how to run it:
https://www.youtube.com/watch?v=4VGZhDXticc

# Key Features:
- Extensive Product Range: Over 100 distinct clothing and shoe items, catering to a wide array of styles and preferences.
- User Accounts: Robust login and registration functionality, allowing customers to create and manage their personal accounts.
- Order Management: Users can view their order history
- Shopping Cart: A dynamic cart system where customers can add items, adjust quantities, or remove products as needed.
- Wishlist: Users can curate a list of desired items for future purchase, enhancing the shopping experience.
- Advanced Search and Filters: A powerful search engine with filters to sort products by price, date of addition, category, brand, gender, and stock availability.
= Category and Brand Sorting: Intuitive categorization and brand-specific pages for easier navigation and product discovery.
- Gender-specific Collections: Separate sections for men's, women's, and unisex items, tailored to suit different gender preferences.
- Stock Indicators: Real-time updates on product availability to ensure customers are informed about in-stock items.

Technologies Used:
Front-End: HTML5, CSS3, JavaScript (with React.js framework)


# Responsive Design:
Mobile-First Approach: The website is designed to be fully responsive and mobile-friendly, ensuring a consistent experience across all devices.

# Conclusion
Sidra Clothing & Shoes is dedicated to providing an exceptional online shopping experience. With our comprehensive range of products and user-centric features, we aim to be the go-to destination for fashion enthusiasts seeking convenience, variety, and style.

Project screenshots:


---

# Demo mode (how this runs on the demo hub)

The README above is the original template's own instructions: it expects you to
start `json-server` on port 8080 in a second terminal. That works locally, and
it is still how you should develop against the template.

It cannot work on the demo hub, which is static hosting — there is no second
terminal and no port 8080. So the build carries a small demo layer that answers
the API *inside the page*:

| File | What it does |
| --- | --- |
| `src/demo/server.js` | An in-memory json-server. Loads `src/data/db.json`, and answers the query language the pages actually use: equality filters, `_lte`/`_gte`, `q`, `_sort`/`_order`, `_page`/`_limit`, and the `x-total-count` header. Writes mutate the in-memory copy, so cart, orders and account changes stick until reload. |
| `src/demo/install.js` | Installs it. This exists as its own module on purpose — see the note below. |
| `src/demo/imageFallback.js` | Swaps a local SVG placeholder in when a product photo fails to load. |

**Why `install.js` is a separate file.** Every `import` in a module is evaluated
before that module's first statement runs. `src/App.jsx` builds the router at
module scope, and the router's loaders fire immediately. So calling
`installDemoServer()` as a *statement* in `main.jsx` was too late — the landing
loader had already escaped to `http://localhost:8080` and failed. Making it an
imported side-effect module, listed first in `main.jsx`, is what guarantees the
interception is in place before any loader runs.

Two other changes the static host needed:

- `src/App.jsx` uses `createHashRouter`, not `createBrowserRouter`. At a nested
  static path with no server rewrites, a history-mode router renders its own
  "404 Not Found" instead of the app.
- `vite.config.js` sets `base: "./"`, so the bundle resolves from wherever it is
  published rather than from the domain root.

To run the template the original way, ignore all of the above and follow the
setup steps further up — the demo layer only intercepts requests that would have
gone to `localhost:8080`, so a real json-server on that port is never reached
in a demo build, and the layer is the only thing you need to remove to restore
normal behaviour.

# Credits

The storefront in this folder is a third-party React template that was uploaded
into this repository; its README (above) is the original author's, written in
their voice. Renaming it to **Sidra Clothing & Shoes**, the demo layer described
above, the hash routing, the image fallback and the local review avatars are the
changes made here. If you ship this to a client, check the original template's
own licence terms first — no licence file came with the upload.

The product photography is **not** licensed for this repository: it is hotlinked
from a live retailer's CDN and shows real third-party brands. Replace it before
this goes anywhere near a paying client.
