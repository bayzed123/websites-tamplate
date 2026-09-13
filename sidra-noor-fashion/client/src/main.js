// First import on purpose: it installs the in-page API before the router
// and store below are evaluated, and both read from the API on import.
import "./demo/install";
import { createApp } from "vue";
import App from "./App.vue";
import "./registerServiceWorker";
import router from "./router";
import store from "./store";
import "./assets/tailwind.css";
import "./assets/style.css";
import {
  FontAwesomeIcon,
  FontAwesomeLayers,
  FontAwesomeLayersText,
} from "@fortawesome/vue-fontawesome";
import "./icons";
import "animate.css";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

createApp(App)
  .use(store)
  .component("fa-icon", FontAwesomeIcon)
  .component("fa-layer", FontAwesomeLayers)
  .component("fa-layer-text", FontAwesomeLayersText)
  .use(router)
  .use(gsap)
  .mount("#app");
