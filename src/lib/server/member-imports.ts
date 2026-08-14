import { isMemberTier, type AccessStatus, type MembershipTier } from '$lib/constants/tiers';

/** Guard against oversized admin uploads — full WC export is ~760 rows. */
export const MAX_IMPORTED_MEMBER_ROWS = 5_000;

export interface ImportedMemberInput {
	email: string;
	name: string;
	tier: MembershipTier;
	accessStatus: AccessStatus;
	role: 'member';
	sourceRef: string | null;
}

function parseCsvRows(input: string): string[][] {
	const rows: string[][] = [];
	let currentRow: string[] = [];
	let currentField = '';
	let inQuotes = false;

	for (let index = 0; index < input.length; index += 1) {
		const char = input[index];
		const next = input[index + 1];

		if (char === '"') {
			if (inQuotes && next === '"') {
				currentField += '"';
				index += 1;
			} else {
				inQuotes = !inQuotes;
			}
			continue;
		}

		if (char === ',' && !inQuotes) {
			currentRow.push(currentField.trim());
			currentField = '';
			continue;
		}

		if ((char === '\n' || char === '\r') && !inQuotes) {
			if (char === '\r' && next === '\n') {
				index += 1;
			}
			currentRow.push(currentField.trim());
			currentField = '';
			if (currentRow.some((value) => value.length > 0)) {
				rows.push(currentRow);
			}
			currentRow = [];
			continue;
		}

		currentField += char;
	}

	if (currentField.length > 0 || currentRow.length > 0) {
		currentRow.push(currentField.trim());
		if (currentRow.some((value) => value.length > 0)) {
			rows.push(currentRow);
		}
	}

	return rows;
}

function normalizeHeader(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function readMappedValue(record: Record<string, string>, keys: readonly string[]): string {
	for (const key of keys) {
		if (record[key]) {
			return record[key];
		}
	}

	return '';
}

export function normalizeImportedTier(value: string): MembershipTier | null {
	const normalized = value.trim().toLowerCase();
	if (!normalized) {
		return null;
	}

	if (normalized.includes('vip')) {
		return 'vip';
	}

	if (normalized.includes('bronze') || normalized.includes('founding')) {
		return 'bronze';
	}

	if (normalized.includes('free')) {
		return 'free';
	}

	return isMemberTier(normalized) ? normalized : null;
}

function normalizeImportedAccessStatus(value: string): AccessStatus {
	const normalized = value.trim().toLowerCase();
	if (normalized === 'active' || normalized === 'revoked') {
		return normalized;
	}

	return 'active';
}

export function parseImportedMemberCsv(input: string): {
	rows: ImportedMemberInput[];
	errors: string[];
} {
	const parsedRows = parseCsvRows(input);
	if (parsedRows.length < 2) {
		return {
			rows: [],
			errors: ['Upload a CSV with a header row and at least one member row.']
		};
	}

	const headers = parsedRows[0].map(normalizeHeader);
	const errors: string[] = [];
	const rows: ImportedMemberInput[] = [];
	const seenEmails = new Set<string>();

	const dataRowCount = parsedRows.length - 1;
	if (dataRowCount > MAX_IMPORTED_MEMBER_ROWS) {
		return {
			rows: [],
			errors: [
				`CSV has ${dataRowCount} rows; maximum supported import is ${MAX_IMPORTED_MEMBER_ROWS}. Split the file and import in batches.`
			]
		};
	}

	for (let index = 1; index < parsedRows.length; index += 1) {
		const values = parsedRows[index];
		const record = Object.fromEntries(
			headers.map((header, headerIndex) => [header, values[headerIndex] || ''])
		);
		const rowNumber = index + 1;

		const email = readMappedValue(record, [
			'email',
			'email_address',
			'buyer_email',
			'customer_email'
		]).toLowerCase();

		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			errors.push(`Row ${rowNumber}: valid email is required.`);
			continue;
		}

		if (seenEmails.has(email)) {
			errors.push(`Row ${rowNumber}: duplicate email ${email}.`);
			continue;
		}

		seenEmails.add(email);

		const fullName = readMappedValue(record, ['name', 'full_name', 'customer_name', 'member_name']);
		const firstName = readMappedValue(record, ['first_name', 'firstname']);
		const lastName = readMappedValue(record, ['last_name', 'lastname']);
		const name = fullName || [firstName, lastName].filter(Boolean).join(' ').trim() || email;

		const tierSource = readMappedValue(record, [
			'tier',
			'membership_tier',
			'package',
			'product',
			'product_name',
			'plan',
			'variant',
			'order_item_name'
		]);
		const tier = normalizeImportedTier(tierSource);
		if (!tier) {
			errors.push(`Row ${rowNumber}: unable to map tier from "${tierSource || 'empty'}".`);
			continue;
		}

		rows.push({
			email,
			name,
			tier,
			accessStatus: normalizeImportedAccessStatus(
				readMappedValue(record, ['access_status', 'status', 'membership_status'])
			),
			// Bulk imports are an entitlement input, never an admin-elevation mechanism.
			role: 'member',
			sourceRef: (() => {
				const orderRef = readMappedValue(record, ['order_id', 'order_number', 'id']);
				if (orderRef) {
					return orderRef.startsWith('wc:') ? orderRef : `wc:${orderRef}`;
				}
				return readMappedValue(record, ['source_ref']) || null;
			})()
		});
	}

	return { rows, errors };
}
