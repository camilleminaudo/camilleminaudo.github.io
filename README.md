# Camille Minaudo — research website

A static personal research site for GitHub Pages. No build step and nothing to install: the page reads its content from the small files in `data/`, and a weekly GitHub Action refreshes the publication list from ORCID.

```
index.html                     page structure (rarely edited)
assets/css/style.css           design
assets/js/main.js              renders the data files
assets/img/portrait.jpg        your photo (add it; 4:5 portrait works best)
data/profile.json              name, bio, links, research themes, path, featured papers
data/projects.json             ongoing and completed projects
data/news.json                 short dated updates
data/software.json             software, teaching, workshops
data/publications.json         generated weekly from ORCID — don't edit by hand
data/publications-manual.json  papers not on ORCID yet (accepted, theses, reports)
scripts/update_publications.py the ORCID + Crossref updater
.github/workflows/site.yml     publishes the site and runs the weekly update
```

## Put it online (about 10 minutes, once)

1. Sign in to GitHub and create a **new public repository** named exactly `YOUR-USERNAME.github.io`
   (for example `cminaudo.github.io`). That name gives you the address `https://YOUR-USERNAME.github.io`.
2. Upload the files: on the empty repository page choose **uploading an existing file**, drag in everything from this folder (including the `.github` folder and the `.nojekyll` file), and commit.
   With git instead: `git init && git add . && git commit -m "First version" && git branch -M main && git remote add origin https://github.com/YOUR-USERNAME/YOUR-USERNAME.github.io.git && git push -u origin main`
3. In the repository go to **Settings → Pages** and set **Source** to **GitHub Actions**.
4. Go to **Actions → Build and publish site → Run workflow**. The first run also fetches your full publication list from ORCID. After a minute or two the site is live.

Hidden folders such as `.github` are easy to miss when dragging files on a Mac (press `Cmd + Shift + .` in Finder to show them).

## Updating content

Edit the JSON files directly on github.com (open the file, click the pencil, commit). Every commit republishes the site within a minute or two.

- **New project:** copy a block in `data/projects.json`, change the text, set `status` to `ongoing` or `completed`, and `theme` to one of `optics`, `carbon`, `production`, `catchments`. When a project finishes, just switch its status.
- **News:** add an entry at the top of `data/news.json`. Use `YYYY-MM` for the date. Five show by default; the rest sit behind "Show all news".
- **Publications:** keep your ORCID record up to date and the site follows every Monday (or run the workflow by hand). Add anything not on ORCID to `data/publications-manual.json`. Pick papers for the "Selected" list by DOI in `featured_publications` in `data/profile.json`.
- **Photo:** add `assets/img/portrait.jpg`. Without it the page shows your initials.
- **Links:** fill in the empty `url` fields in `profile.json` (Google Scholar, GitHub, LinkedIn, CV). Empty links are hidden. Same for `email`.

JSON is strict: every item except the last in a list needs a comma, and text goes in double quotes. If the page suddenly shows empty sections after an edit, paste the file into https://jsonlint.com to find the typo.

## Preview on your computer

From this folder run `python3 -m http.server` and open http://localhost:8000. (Opening `index.html` directly from disk doesn't load the data files.)

## Custom domain (optional)

Buy a domain, add it under **Settings → Pages → Custom domain**, and follow GitHub's DNS instructions.

## To check before going live

- Years and dates in `positions` (profile.json) — two are blank because I couldn't confirm them.
- Project years for ongoing projects are blank; add start years if you want them shown.
- Which ongoing projects you are happy to describe publicly, and how.
- Email address to show.
