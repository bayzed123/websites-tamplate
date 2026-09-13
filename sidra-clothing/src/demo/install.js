/**
 * Side-effect module: installs the in-page json-server the moment it is
 * imported.
 *
 * This exists as its own file because of ES module evaluation order. Calling
 * installDemoServer() from a statement in main.jsx is too late: every `import`
 * in that file — App.jsx included — is evaluated before the first statement
 * runs, and App.jsx creates the router, whose landing loader fires the first
 * request. That request went straight to localhost:8080 and the home page
 * rendered empty while every other route worked.
 *
 * Imported first in main.jsx, this runs before App.jsx's module body, so the
 * adapter is in place before any route exists to load.
 */
import axios from 'axios';
import { installDemoServer } from './server';

installDemoServer(axios);
