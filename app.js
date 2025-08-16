// app.js — ESM entry
import { attachListeners, init } from "./ui.js";

(async function(){
  await init();
  await attachListeners();
})();