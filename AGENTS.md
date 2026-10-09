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

- The exported site lives as static files in public/site and is shown on / in a full-screen iframe; the /wp-content/$ server route redirects original WordPress file paths to the downloaded copies (map in src/lib/site-asset-map.json) because the site scripts request files by their original paths.
