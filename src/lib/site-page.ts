import home from "./site-pages/home.html?raw";
import contact from "./site-pages/contact.html?raw";
import projects from "./site-pages/projects.html?raw";
import world from "./site-pages/world.html?raw";

const pages = { home, contact, projects, world } as const;

// Serves the exported site's original HTML at its original address, because the
// site's scripts choose the 3D scene from the current address.
export function sitePage(name: keyof typeof pages) {
  return new Response(pages[name], {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
