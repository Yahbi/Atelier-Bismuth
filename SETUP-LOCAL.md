# Run Claude Code locally so it can browse Etsy itself

The cloud session can't reach Etsy and has no browser. Running Claude Code on
your Mac fixes both: it uses your normal internet, and a browser MCP lets it
open, navigate, and screenshot pages (including your Etsy shop) directly.

Copy-paste these in **Terminal** (Mac). You need Node 18+ (`node -v` to check;
if missing, install from https://nodejs.org).

```bash
# 1. Install Claude Code
npm install -g @anthropic-ai/claude-code

# 2. Get this project (all the work + branch are already on GitHub)
git clone https://github.com/Yahbi/Atelier-Bismuth.git
cd Atelier-Bismuth
git checkout claude/atelier-bismuth-shopify-8msznm

# 3. Add a browser the assistant can drive (Playwright MCP)
claude mcp add playwright -- npx @playwright/mcp@latest

# 4. Start Claude Code in this folder
claude
```

Then, in that local Claude Code session, paste this to continue exactly where
we are:

> Continue the Atelier Bismuth project. Use the Playwright browser MCP to open
> https://www.etsy.com/shop/AtelierBismuth, navigate every page of the shop,
> and capture each product (title, price, description, dimensions, image URLs).
> Then load that real data into the theme + the /docs preview, and generate the
> Shopify import CSV with tools/build-catalog.js.

That session runs on your machine, so it can reach Etsy and screenshot it — the
two things this cloud session cannot do.

---

### Don't want to install anything?
Skip all of the above and just **send screenshots of your Etsy shop pages** into
the chat. The assistant reads them exactly and builds the catalog from them — no
setup, works immediately.
