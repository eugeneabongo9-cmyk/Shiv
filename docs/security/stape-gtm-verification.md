# Stape GTM / Meta tracking verification

After deploy, confirm server-side GTM loads and Meta tags (configured in Stape) can fire.

## Page source

On `https://theshivworksnetwork.com`, View Source and search for:

- `load.sst.theshivworksnetwork.com`
- `sst.theshivworksnetwork.com`
- `dataLayer`
- `aqaetnier`

You will **not** see classic `GTM-XXXX` / `googletagmanager.com` — this install uses Stape.

## Browser checks

1. Hard-refresh the landing page.
2. Console: no CSP errors for `aqaetnier.js`.
3. Network: `aqaetnier.js` returns **200**.
4. If Meta still fails after the loader succeeds, check the Console for blocked Facebook domains and add only those origins to CSP.

## CSP regression

Unit coverage lives in `src/lib/server/csp.test.ts` and asserts Stape origins remain in `script-src` and `connect-src`.
