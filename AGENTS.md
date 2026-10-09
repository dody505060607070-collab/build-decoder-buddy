<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The site's original server HTML (src/lib/site-pages/*.html) is served at its original addresses (/, /contact, /projects, /world) by route server handlers, because the site's scripts pick the 3D scene from the address; static files live in public/site/assets and the /wp-content/$ route redirects original WordPress file paths to them via src/lib/site-asset-map.json.
