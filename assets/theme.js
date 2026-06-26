/* ============================================================================
   Atelier Bismuth — theme behaviours (vanilla JS, no dependencies)
   ========================================================================= */
(function () {
  "use strict";

  const root = document.documentElement;
  const money = window.AB && window.AB.moneyFormat ? window.AB.moneyFormat : "${{amount}}";

  /* --- formatMoney (cents -> store currency) ----------------------------- */
  function formatMoney(cents) {
    if (typeof cents === "string") cents = cents.replace(".", "");
    const value = (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const whole = (cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
    return money
      .replace(/\{\{\s*amount\s*\}\}/g, value)
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/g, whole)
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/g, value);
  }
  window.AB = window.AB || {};
  window.AB.formatMoney = formatMoney;

  /* --- Scroll reveal ----------------------------------------------------- */
  function initReveal() {
    const els = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window) || !els.length) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );
    els.forEach((el) => io.observe(el));
  }

  /* --- Header scroll state ---------------------------------------------- */
  function initHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* --- Mobile drawer ----------------------------------------------------- */
  function initDrawer() {
    const drawer = document.querySelector("[data-drawer]");
    if (!drawer) return;
    const open = () => { drawer.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; };
    const close = () => { drawer.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; };
    document.querySelectorAll("[data-drawer-open]").forEach((b) => b.addEventListener("click", open));
    drawer.querySelectorAll("[data-drawer-close], .drawer__scrim").forEach((b) => b.addEventListener("click", close));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  /* --- Quantity steppers ------------------------------------------------- */
  function initQty(scope) {
    (scope || document).querySelectorAll("[data-qty]").forEach((wrap) => {
      if (wrap.dataset.bound) return;
      wrap.dataset.bound = "1";
      const input = wrap.querySelector("input");
      wrap.querySelector("[data-qty-minus]").addEventListener("click", () => {
        input.value = Math.max(1, (parseInt(input.value, 10) || 1) - 1);
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      wrap.querySelector("[data-qty-plus]").addEventListener("click", () => {
        input.value = (parseInt(input.value, 10) || 1) + 1;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });
  }

  /* --- Cart count helper ------------------------------------------------- */
  function refreshCartCount() {
    fetch("/cart.js", { headers: { "Content-Type": "application/json" } })
      .then((r) => r.json())
      .then((cart) => {
        document.querySelectorAll("[data-cart-count]").forEach((el) => {
          el.textContent = cart.item_count;
          el.style.display = cart.item_count > 0 ? "" : "none";
        });
        document.dispatchEvent(new CustomEvent("cart:updated", { detail: cart }));
      })
      .catch(() => {});
  }
  window.AB.refreshCartCount = refreshCartCount;

  /* --- Async add to cart (forms with data-cart-form) --------------------- */
  function initCartForms() {
    document.querySelectorAll("form[data-cart-form]").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const btn = form.querySelector('[type="submit"]');
        const label = btn ? btn.querySelector("[data-btn-label]") : null;
        const original = label ? label.textContent : "";
        if (label) label.textContent = "Adding…";
        if (btn) btn.disabled = true;
        fetch("/cart/add.js", { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) })
          .then((r) => r.json())
          .then((item) => {
            if (item.status) throw new Error(item.description || "Could not add to cart");
            refreshCartCount();
            openCartDrawer();
            if (label) label.textContent = "Added ✓";
            setTimeout(() => { if (label) label.textContent = original; if (btn) btn.disabled = false; }, 1400);
          })
          .catch((err) => {
            if (label) label.textContent = original;
            if (btn) btn.disabled = false;
            alert(err.message);
          });
      });
    });
  }

  function openCartDrawer() {
    const cd = document.querySelector("[data-cart-drawer]");
    if (!cd) return;
    fetch("/?section_id=cart-drawer")
      .then((r) => r.text())
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const fresh = doc.querySelector("[data-cart-drawer-content]");
        const target = cd.querySelector("[data-cart-drawer-content]");
        if (fresh && target) target.innerHTML = fresh.innerHTML;
        cd.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        bindCartDrawer(cd);
      })
      .catch(() => {});
  }
  window.AB.openCartDrawer = openCartDrawer;

  function bindCartDrawer(cd) {
    cd.querySelectorAll("[data-cart-close], .drawer__scrim").forEach((b) =>
      b.addEventListener("click", () => { cd.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; })
    );
    cd.querySelectorAll("[data-line-change]").forEach((el) => {
      el.addEventListener("change", () => {
        const line = el.getAttribute("data-line");
        const qty = el.value;
        fetch("/cart/change.js", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ line: parseInt(line, 10), quantity: parseInt(qty, 10) }),
        })
          .then((r) => r.json())
          .then(() => { refreshCartCount(); openCartDrawer(); });
      });
    });
  }

  function initCartDrawerTriggers() {
    document.querySelectorAll("[data-open-cart]").forEach((b) =>
      b.addEventListener("click", (e) => { e.preventDefault(); openCartDrawer(); })
    );
  }

  /* --- PDP gallery thumbnail switch ------------------------------------- */
  function initGallery() {
    document.querySelectorAll("[data-gallery]").forEach((gallery) => {
      const main = gallery.querySelector("[data-gallery-main] img");
      gallery.querySelectorAll("[data-gallery-thumb]").forEach((thumb) => {
        thumb.addEventListener("click", () => {
          const src = thumb.getAttribute("data-src");
          if (main && src) main.src = src;
          gallery.querySelectorAll("[data-gallery-thumb]").forEach((t) => t.classList.remove("is-active"));
          thumb.classList.add("is-active");
        });
      });
    });
  }

  /* --- Variant selection ------------------------------------------------- */
  function initVariants() {
    document.querySelectorAll("[data-product-form]").forEach((form) => {
      const data = window[form.getAttribute("data-product-id")];
      if (!data) return;
      const idInput = form.querySelector('[name="id"]');
      const priceEl = document.querySelector("[data-product-price]");
      const compareEl = document.querySelector("[data-product-compare]");
      const submit = form.querySelector('[type="submit"] [data-btn-label]');
      const selects = form.querySelectorAll("[data-option-index]");

      function currentVariant() {
        const chosen = Array.from(selects).map((s) => s.value);
        return data.variants.find((v) => chosen.every((val, i) => v.options[i] === val));
      }
      function update() {
        const v = currentVariant();
        if (!v) { if (submit) submit.textContent = "Unavailable"; return; }
        idInput.value = v.id;
        if (priceEl) priceEl.textContent = formatMoney(v.price);
        if (compareEl) {
          if (v.compare_at_price && v.compare_at_price > v.price) {
            compareEl.textContent = formatMoney(v.compare_at_price);
            compareEl.style.display = "";
          } else { compareEl.style.display = "none"; }
        }
        if (submit) submit.textContent = v.available ? "Add to cart" : "Sold out";
      }
      selects.forEach((s) => s.addEventListener("change", update));
      // pill / swatch click → set hidden select
      form.querySelectorAll("[data-variant-pill]").forEach((pill) => {
        pill.addEventListener("click", () => {
          const idx = pill.getAttribute("data-option-target");
          const sel = form.querySelector('[data-option-index="' + idx + '"]');
          if (sel) { sel.value = pill.getAttribute("data-value"); sel.dispatchEvent(new Event("change")); }
          pill.parentElement.querySelectorAll("[data-variant-pill]").forEach((p) => p.classList.remove("is-active"));
          pill.classList.add("is-active");
        });
      });
      update();
    });
  }

  /* --- Init -------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    initReveal();
    initHeader();
    initDrawer();
    initQty();
    initCartForms();
    initCartDrawerTriggers();
    initGallery();
    initVariants();
    refreshCartCount();
  });
})();
