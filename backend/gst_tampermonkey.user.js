// ==UserScript==
// @name         GST Portal → CA Dashboard
// @namespace    ca-client-dashboard
// @version      1.0
// @description  Extracts GSTIN details from GST portal search results and sends them back to CA Dashboard automatically
// @match        https://services.gst.gov.in/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const gstin  = params.get('gstin') || '';

  // ── Auto-fill GSTIN input ──────────────────────────────────────────────────
  if (gstin) {
    const tryFill = setInterval(() => {
      const inp = document.querySelector(
        'input[id*="gstin" i], input[name*="gstin" i], ' +
        'input[placeholder*="gstin" i], input[placeholder*="GSTIN" i], ' +
        'input[id="for_gstin"], input[id="gstin"]'
      );
      if (inp && !inp.value) {
        clearInterval(tryFill);
        inp.value = gstin;
        inp.dispatchEvent(new Event('input',  { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
        // Angular ng-model trigger
        try {
          const ng = angular.element(inp).scope();
          if (ng) { ng.$apply(); }
        } catch (_) {}
      }
    }, 300);
    setTimeout(() => clearInterval(tryFill), 15000);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function normalizeDate(s) {
    if (!s) return null;
    const m = s.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return s.trim() || null;
  }

  // Find the value paired with a label — works across table rows, dl/dd, and div pairs
  function findValue(labelTexts) {
    const labelRe = new RegExp(labelTexts.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');

    // Strategy 1: <tr><td>label</td><td>value</td></tr>
    const tds = document.querySelectorAll('td, th');
    for (const td of tds) {
      if (labelRe.test(td.textContent.trim())) {
        const next = td.nextElementSibling;
        if (next) {
          const val = next.textContent.trim();
          if (val && val.toLowerCase() !== td.textContent.trim().toLowerCase()) return val;
        }
        // value might be in the next row's first td
        const row = td.closest('tr');
        if (row && row.nextElementSibling) {
          const nextTd = row.nextElementSibling.querySelector('td');
          if (nextTd) return nextTd.textContent.trim();
        }
      }
    }

    // Strategy 2: <dt>label</dt><dd>value</dd>
    const dts = document.querySelectorAll('dt');
    for (const dt of dts) {
      if (labelRe.test(dt.textContent.trim())) {
        const dd = dt.nextElementSibling;
        if (dd && dd.tagName === 'DD') return dd.textContent.trim();
      }
    }

    // Strategy 3: element with label text → parent's next sibling
    const all = document.querySelectorAll('span, p, div, label, strong, b');
    for (const el of all) {
      const txt = el.textContent.trim();
      if (labelRe.test(txt) && txt.length < 80) {
        const sib = el.nextElementSibling;
        if (sib) {
          const val = sib.textContent.trim();
          if (val && !labelRe.test(val)) return val;
        }
        const parentSib = el.parentElement?.nextElementSibling;
        if (parentSib) {
          const inner = parentSib.querySelector('span, div, td, p');
          const val   = (inner || parentSib).textContent.trim();
          if (val && !labelRe.test(val)) return val;
        }
      }
    }

    return null;
  }

  function extractAndSend() {
    const legal_name = findValue(['legal name of business', 'legal name']);
    const trade_name = findValue(['trade name']);
    if (!legal_name && !trade_name) return false; // results not rendered yet

    const gstin_status      = findValue(['gstin status', 'uin status', 'status of gstin', 'status']);
    const registration_date = findValue(['date of registration', 'registration date']);
    const reg_type          = findValue(['constitution of business', 'taxpayer type', 'type of taxpayer', 'constitution']);
    const state             = findValue(['state jurisdiction', 'jurisdiction', 'state']);
    const address           = findValue(['principal place of business', 'principal address', 'principal place']);
    const nob               = findValue(['nature of business activities', 'nature of business']);
    const einv_raw          = findValue(['e-invoice applicable', 'einvoice applicable', 'e invoice']);

    const data = {
      legal_name,
      trade_name:           trade_name  || null,
      gstin_status:         gstin_status || null,
      registration_date:    normalizeDate(registration_date),
      registration_type:    reg_type    || null,
      state:                state       || null,
      state_code:           gstin ? gstin.substring(0, 2) : null,
      principal_address:    address     || null,
      nature_of_business:   nob         || null,
      einvoice_applicable:  einv_raw ? /yes|applicable/i.test(einv_raw) : null,
      last_fetched_at:      new Date().toISOString(),
    };

    const target = window.opener || window.parent;
    if (!target || target === window) {
      showBanner('⚠ Could not find the CA Dashboard tab. Please keep it open.', '#d97706');
      return true;
    }

    target.postMessage({ type: 'GST_DATA', gstin, data }, '*');
    showBanner('✓ Data sent to CA Dashboard — you can close this tab.', '#16a34a');
    return true;
  }

  function showBanner(msg, bg) {
    const existing = document.getElementById('_ca_banner');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = '_ca_banner';
    el.style.cssText = `position:fixed;top:0;left:0;right:0;background:${bg};color:#fff;` +
      `text-align:center;padding:14px;font-size:14px;font-weight:600;z-index:2147483647;` +
      `box-shadow:0 2px 8px rgba(0,0,0,.3);`;
    el.textContent = msg;
    document.body.prepend(el);
  }

  // ── Watch for results ──────────────────────────────────────────────────────
  let sent = false;
  const observer = new MutationObserver(() => {
    if (!sent && extractAndSend()) {
      sent = true;
      observer.disconnect();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    observer.observe(document.body, { childList: true, subtree: true });
    // Try immediately for already-rendered results
    if (!sent && extractAndSend()) {
      sent = true;
      observer.disconnect();
    }
  }
})();
