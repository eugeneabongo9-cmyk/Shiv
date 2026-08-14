#!/usr/bin/env node
// Renders each invoice in invoices.json against ../templates/pr-invoice.html
// into a sibling .html file. No external deps.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = readFileSync(join(__dirname, '..', 'templates', 'pr-invoice.html'), 'utf8');
const DATA = JSON.parse(readFileSync(join(__dirname, 'invoices.json'), 'utf8'));

const money = (n) =>
	'$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function buildFileList(prefix, paths) {
	if (!paths || paths.length === 0) return `${prefix} (none)`;
	return paths.map((p) => `${prefix} ${p}`).join('\n');
}

function render(inv) {
	const ctx = { ...DATA.defaults, ...inv };
	ctx.FILES_ADDED_COUNT = (inv.FILES_ADDED || []).length;
	ctx.FILES_CHANGED_COUNT = (inv.FILES_CHANGED || []).length;
	ctx.FILES_DELETED_COUNT = (inv.FILES_DELETED || []).length;
	ctx.FILES_ADDED_LIST = buildFileList('+', inv.FILES_ADDED);
	ctx.FILES_CHANGED_LIST = buildFileList('~', inv.FILES_CHANGED);
	ctx.FILES_DELETED_LIST = buildFileList('-', inv.FILES_DELETED);

	let html = TEMPLATE;

	// Line items: template ships with 2 hard-coded slots; we replace the table by
	// building line-item rows programmatically and injecting between the section
	// header and the total row.
	const lineItemsHtml = inv.LINE_ITEMS.map((li) => {
		const subtotal = li.HOURS * li.RATE;
		return `    <tr class="line-item">
      <td class="desc">
        ${li.NAME}
        <span class="period">${li.HOURS} hrs &middot; ${money(li.RATE)}/hr &middot; ${li.ROLE}</span>
        <span class="summary">${li.SUMMARY}</span>
      </td>
      <td class="value">${money(subtotal)}</td>
    </tr>`;
	}).join('\n');

	const total = inv.LINE_ITEMS.reduce((acc, li) => acc + li.HOURS * li.RATE, 0);
	ctx.TOTAL = money(total);

	// Strip the two placeholder line-item rows and the comment between them.
	const placeholderRegex =
		/<tr class="line-item">[\s\S]*?<!-- Duplicate the row above for additional line items -->/m;
	html = html.replace(placeholderRegex, lineItemsHtml + '\n    <!-- generated -->');

	// Substitute all {{KEY}} occurrences.
	for (const [k, v] of Object.entries(ctx)) {
		html = html.replaceAll(`{{${k}}}`, String(v));
	}

	// Wipe any remaining {{...}} (line-item slots we removed).
	html = html.replace(/\{\{[^}]+\}\}/g, '');

	return html;
}

let grandTotal = 0;
let grandHours = 0;
for (const inv of DATA.invoices) {
	const html = render(inv);
	const file = join(__dirname, `${inv.INVOICE_ID}-${inv.BRANCH.replace(/[\/]/g, '-')}.html`);
	writeFileSync(file, html, 'utf8');
	const sub = inv.LINE_ITEMS.reduce((acc, li) => acc + li.HOURS * li.RATE, 0);
	const hrs = inv.LINE_ITEMS.reduce((acc, li) => acc + li.HOURS, 0);
	grandTotal += sub;
	grandHours += hrs;
	console.log(
		`  ${inv.INVOICE_ID}  ${hrs.toFixed(1).padStart(5)} hrs  ${money(sub).padStart(10)}  ${inv.PR_TITLE}`
	);
}
console.log(
	`  ${'TOTAL'.padEnd(10)} ${grandHours.toFixed(1).padStart(5)} hrs  ${money(grandTotal).padStart(10)}`
);
