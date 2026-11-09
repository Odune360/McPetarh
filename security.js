/* ==========================================================
   MC-Petarh — site hardening (drop-in, no dependencies)

   Add ONE line inside <head> of every page:
       <script src="security.js"></script>

   What it does
   1. Stops other websites from embedding (framing) your pages
   2. Makes every external / new-tab link safe (noopener noreferrer)
   3. Hardens every form:
        - invisible honeypot field that catches bots
        - blocks double-sends
        - caps how much text can be typed
   4. Prints a warning in the browser console against "paste this code"
      scams (the usual way site owners get hijacked)
   ========================================================== */
(function () {
    'use strict';

    /* ---------- 1. Anti-framing (runs immediately) ---------- */
    try {
        if (window.top !== window.self) {
            var sameSite = false;
            try { sameSite = window.top.location.hostname === window.self.location.hostname; }
            catch (e) { sameSite = false; }                       // cross-origin parent: reading it throws
            if (!sameSite) {
                document.documentElement.style.display = 'none';  // hide the page inside the hostile frame
                try { window.top.location.replace(window.self.location.href); } catch (e2) {}
            }
        }
    } catch (e3) {
        document.documentElement.style.display = 'none';
    }

    /* ---------- 4. Console warning ---------- */
    try {
        console.log('%cStop!', 'color:#b00020;font-size:34px;font-weight:bold;');
        console.log('%cThis console is for developers. If someone told you to paste something here, it is a scam that can give them control of your accounts.', 'font-size:14px;');
    } catch (e4) {}

    function ready(fn) {
        if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', fn); }
        else { fn(); }
    }

    /* ---------- 2. Safe links ---------- */
    function hardenLinks() {
        var links = document.querySelectorAll('a[href]');
        Array.prototype.forEach.call(links, function (a) {
            var external = false;
            try { external = new URL(a.href, location.href).origin !== location.origin; } catch (e) {}
            if (a.target === '_blank' || external) {
                var rel = (a.getAttribute('rel') || '').toLowerCase().split(/\s+/).filter(Boolean);
                ['noopener', 'noreferrer'].forEach(function (v) { if (rel.indexOf(v) === -1) { rel.push(v); } });
                a.setAttribute('rel', rel.join(' '));
            }
        });
    }

    /* ---------- 3. Safer forms ---------- */
    function hardenForms() {
        var LIMITS = { text: 160, tel: 25, email: 120, search: 160, url: 200 };
        Array.prototype.forEach.call(document.querySelectorAll('form'), function (form) {
            /* honeypot: invisible to people, irresistible to bots */
            if (!form.querySelector('[name="_honey"]')) {
                var trap = document.createElement('input');
                trap.type = 'text';
                trap.name = '_honey';
                trap.tabIndex = -1;
                trap.autocomplete = 'off';
                trap.setAttribute('aria-hidden', 'true');
                trap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
                form.appendChild(trap);
            }

            /* cap input lengths where the page did not */
            Array.prototype.forEach.call(form.querySelectorAll('input, textarea'), function (el) {
                if (el.hasAttribute('maxlength') || el.name === '_honey') { return; }
                var type = el.tagName === 'TEXTAREA' ? 'textarea' : (el.type || 'text');
                if (type === 'textarea') { el.setAttribute('maxlength', '2000'); }
                else if (LIMITS[type]) { el.setAttribute('maxlength', String(LIMITS[type])); }
            });

            form.addEventListener('submit', function (e) {
                var trapEl = form.querySelector('[name="_honey"]');
                if (trapEl && trapEl.value) { e.preventDefault(); return; }           // a bot filled the hidden field
                if (form.getAttribute('data-sent') === '1') { e.preventDefault(); return; }   // already sending
                form.setAttribute('data-sent', '1');
                var btn = form.querySelector('[type="submit"], button:not([type])');
                if (btn) {
                    setTimeout(function () {
                        btn.setAttribute('data-label', btn.textContent);
                        btn.disabled = true;
                        btn.textContent = 'Sending\u2026';
                    }, 0);
                }
            });

            /* coming back with the Back button: let the form be used again */
            window.addEventListener('pageshow', function (e) {
                if (!e.persisted) { return; }
                form.removeAttribute('data-sent');
                var btn = form.querySelector('[type="submit"], button:not([type])');
                if (btn && btn.hasAttribute('data-label')) { btn.disabled = false; btn.textContent = btn.getAttribute('data-label'); }
            });
        });
    }

    ready(function () { hardenLinks(); hardenForms(); });
})();
