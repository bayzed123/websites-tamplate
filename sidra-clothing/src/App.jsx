import { RouterProvider, createHashRouter } from "react-router-dom";
import {
  About,
  Cart,
  Contact,
  HomeLayout,
  Landing,
  Login,
  Register,
  Shop,
  SingleProduct,
  Wishlist,
  Profile,
  Search,
  ThankYou,
  OrderHistory
} from "./pages";
import { landingLoader } from "./pages/Landing";
import { singleProductLoader } from "./pages/SingleProduct";
import { shopLoader } from "./pages/Shop";
import { ToastContainer } from "react-toastify";

/*
 * Hash routing, because this is published as plain files inside the demo hub —
 * several directories deep, on a static host with no rewrite rules. A path
 * router there matches nothing: the app loads at /demos/sidra-clothing/ and
 * react-router answers "404 Not Found" before a single screen renders, which
 * is exactly what it did. The hash never reaches the host, so it works at any
 * depth with nothing to configure.
 */
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCustomers from "./pages/admin/AdminCustomers";
import { adminLoader } from "./pages/admin/adminData";

const router = createHashRouter([
  {
    path: "/",
    element: <HomeLayout />,
    children: [
      {
        index: true,
        element: <Landing />,
        loader: landingLoader,
      },
      {
        path: "shop",
        element: <Shop />,
        loader: shopLoader

      },
      {
        path: "shop/product/:id",
        element: <SingleProduct />,
        loader: singleProductLoader,
      },
      {
        path: "about",
        element: <About />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "register",
        element: <Register />,
      },
      {
        path: "contact",
        element: <Contact />,
      },
      {
        path: "about-us",
        element: <About />,
      },
      {
        path: "cart",
        element: <Cart />,
      },
      {
        path: "wishlist",
        element: <Wishlist />,
      },
      {
        path: "user-profile",
        element: <Profile />,
      },
      {
        path:"search",
        element: <Search />
      },
      {
        path:"thank-you",
        element: <ThankYou />
      },
      {
        path:"order-history",
        element: <OrderHistory />
      }
    ],
  },
  {
    /* The admin sits beside the shop rather than inside it: it has its own
       chrome, and nesting it under HomeLayout would wrap every screen in the
       storefront header, footer and newsletter strip.

       One loader for all four screens, so every number on every screen is
       read from the same fetch of the same catalogue the shop serves. */
    path: "/admin",
    element: <AdminLayout />,
    loader: adminLoader,
    id: "admin",
    children: [
      { index: true, element: <AdminDashboard />, loader: adminLoader },
      { path: "products", element: <AdminProducts />, loader: adminLoader },
      { path: "orders", element: <AdminOrders />, loader: adminLoader },
      { path: "customers", element: <AdminCustomers />, loader: adminLoader },
    ],
  },
]);

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer position="top-center" />
    </>
  );
}

export default App;
