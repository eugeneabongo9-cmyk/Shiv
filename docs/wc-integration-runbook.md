# WooCommerce Integration Runbook

Covers the three operational steps required to complete the ShivWorks WC ↔ Network purchase pipeline: webhook configuration (w437), PHP template deployment (w439), and ActiveCampaign automation setup (w462-ops).

**Audience:** Alex (WC store), Aaron (AC dashboard).  
**Network app URL:** `https://network.shivworks.com`  
**Store URL:** `https://shivworkspg.com`

---

## w436 — Member-count API (already live)

The endpoint `GET https://network.shivworks.com/api/members` returns:

```json
{ "bronze": 12, "vip": 3, "total": 15 }
```

It is CORS-enabled for `https://shivworkspg.com` with `Cache-Control: public, max-age=60, stale-while-revalidate=30`.

**Tracker widget installation (Alex):**

1. Upload the plugin folder `store/shivworks-wc/` (containing `shivworks-wc.php`, `checkout-bronze.php`, `checkout-vip.php`) to `wp-content/plugins/`.
2. Activate the plugin in WP Admin → Plugins.
3. Place `[shivworks_member_count]` on any page or widget area to display live counts.
4. Optional attributes: `show_vip="false"` hides the VIP row; `show_total="false"` hides the total.

Example shortcode: `[shivworks_member_count show_vip="true" show_total="true" class="my-tracker"]`

The counts are fetched client-side via JavaScript `fetch()`. If the request fails, dashes are shown silently.

---

## w437 — WooCommerce Webhook Configuration

**Who:** Alex  
**Where:** WC Admin → WooCommerce → Settings → Advanced → Webhooks

### Steps

1. Click **Add webhook**.
2. Fill in:
   | Field | Value |
   |-------|-------|
   | Name | `ShivWorks Network Provision` |
   | Status | Active |
   | Topic | Order created |
   | Delivery URL | `https://network.shivworks.com/api/wc/webhook` |
   | Secret | *(copy from Infisical → `WC_WEBHOOK_SECRET`)* |
   | API version | WP REST API Integration v3 |
3. Save and repeat for a second webhook with **Topic = Order updated** (same URL, same secret).
4. Click **Send test** on both webhooks. Confirm the Network app returns `200`.
   - A test delivery sends a sample payload; the Network app will respond `200` with `"ignored": true` (test orders have non-completion statuses — that is expected).
5. Confirm the webhooks show **Delivered** in the log column.

### Verification

After a real test order completes, check:

- WC → Webhooks → Delivery log shows `200` response.
- Cloudflare Logs (or `wrangler tail`) shows `wc.webhook` with `"tier": "bronze"` or `"vip"`.
- D1 Admin → `member_imports` table has a row for the test email.

### Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| `401 invalid signature` | Secret mismatch — re-copy from Infisical |
| `500 webhook not configured` | `WC_WEBHOOK_SECRET` not set in Cloudflare env |
| `400 invalid order shape` | WC API version mismatch — ensure v3 selected |

---

## w439 — Checkout PHP Templates (Deployment)

**Who:** Alex  
**Files:** `store/shivworks-wc.php`, `store/checkout-bronze.php`, `store/checkout-vip.php`

### Deployment via plugin (recommended)

1. Create folder: `wp-content/plugins/shivworks-wc/`
2. Copy the three files from the `store/` directory into it:
   ```
   wp-content/plugins/shivworks-wc/
   ├── shivworks-wc.php
   ├── checkout-bronze.php
   └── checkout-vip.php
   ```
3. Activate in WP Admin → Plugins → **ShivWorks Network — WooCommerce Integration**.
4. Navigate to the checkout page with Bronze product (ID 31517) in cart — confirm the Bronze messaging block appears above the order summary.
5. Repeat with VIP product (ID 31518) in cart — confirm VIP block appears.

### Deployment via child theme (alternative)

1. Copy `checkout-bronze.php` and `checkout-vip.php` into the child theme folder.
2. Copy the contents of `shivworks-wc.php` (minus the plugin header) into `functions.php`.
3. Update `plugin_dir_path( __FILE__ )` references to `get_stylesheet_directory() . '/'`.

### Fortis gateway

No custom code is required for Fortis — the tier messaging renders in a separate `<div>` above the WooCommerce payment section. Fortis's gateway renders in the standard `#payment` section. The plugin does not override the payment template.

### End-to-end test checklist

- [ ] Bronze product in cart → Bronze messaging visible at checkout
- [ ] VIP product in cart → VIP messaging visible at checkout
- [ ] Complete a test order with a real card (or Fortis test mode)
- [ ] Thank-you page shows "Your ShivWorks Network access is being provisioned" with the Network link
- [ ] Within 2 minutes, sign into `network.shivworks.com` with the order email — membership active
- [ ] D1 `member_imports` row present for the test email

---

## w462-ops — ActiveCampaign Automation Setup

**Who:** Aaron  
**Tag names (hardcoded in Network app):**
- Bronze: `Jujitsu_Course_Member`
- VIP: `VIP_Founding`

These exact strings are used by `tagNameForTier()` in `src/lib/server/activecampaign.ts`. Do not rename them.

### 1. Create the tags (if missing)

In AC → Lists → Tags:

1. Create tag `Jujitsu_Course_Member` (type: Contact).
2. Create tag `VIP_Founding` (type: Contact).
3. Note the tag IDs — not needed in the Network app but useful for AC automation conditions.

### 2. Create automations

**Automation A: Bronze member welcome sequence**

| Setting | Value |
|---------|-------|
| Trigger | Contact tag is added: `Jujitsu_Course_Member` |
| Action 1 | Send email: Bronze welcome sequence (your existing AC template or create one) |
| Action 2 | (Optional) Add to Bronze segment/list |

**Automation B: VIP member welcome sequence**

| Setting | Value |
|---------|-------|
| Trigger | Contact tag is added: `VIP_Founding` |
| Action 1 | Send email: VIP welcome sequence |
| Action 2 | (Optional) Add to VIP segment/list |

Note the automation IDs from the AC URL (e.g. `/app/automations/123/edit`) and record them here once created:

- Bronze automation ID: ___________
- VIP automation ID: ___________

### 3. Test

1. In WC, complete a test Bronze order using a real email you control.
2. Confirm within 2 minutes:
   - D1 `member_imports` has the email row.
   - AC contact exists with tag `Jujitsu_Course_Member`.
   - Automation A triggered and the welcome email was sent.
3. Repeat with a VIP test order (product 31518).
4. Confirm AC contact has tag `VIP_Founding` and Automation B triggered.

### 4. Troubleshooting AC tag issues

The Network app logs `activecampaign.tag.missing` if a tag does not exist in AC at the time of the webhook. Check Cloudflare Logs for this event. If it fires:

1. Create the missing tag in AC with the exact name shown above.
2. Re-trigger the webhook by updating the WC order status (set to "Processing" then save).

---

## Rollout checklist

- [ ] Plugin activated on `shivworkspg.com` (Alex)
- [ ] Bronze/VIP checkout messaging visible (Alex)
- [ ] Thank-you page CTA pointing to Network (Alex)
- [ ] WC webhook: `Order created` live, delivery log shows `200` (Alex)
- [ ] WC webhook: `Order updated` live, delivery log shows `200` (Alex)
- [ ] AC tags `Jujitsu_Course_Member` and `VIP_Founding` created (Aaron)
- [ ] AC Bronze automation live and tested (Aaron)
- [ ] AC VIP automation live and tested (Aaron)
- [ ] End-to-end test order: Bronze — member_imports row, AC tag, welcome email (both)
- [ ] End-to-end test order: VIP — member_imports row, AC tag, welcome email (both)
- [ ] Member-count tracker widget shows live counts on store page (Alex)
