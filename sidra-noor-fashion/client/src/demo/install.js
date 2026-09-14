/**
 * Install the in-page API before anything can call it.
 *
 * This is a module, not a function call, for the same reason it is in
 * sidra-clothing: every `import` in a file is evaluated before that file's
 * first statement runs. main.js imports the router and the store at the top,
 * and both read from the API as they initialise — so calling install() as a
 * statement in main.js would already be too late, and the first request would
 * escape to a localhost:3000 that is not there.
 *
 * Importing this first is what guarantees the adapter is in place.
 */
import axios from 'axios';
import instance from '../axios';
import { installDemoServer } from './server';

// The app has two axios objects: the configured `instance` every store uses,
// and the bare default that store/users.js reaches for to talk to imgbb.
// Both need the adapter or one of them still leaves the page.
installDemoServer(instance);
installDemoServer(axios);
