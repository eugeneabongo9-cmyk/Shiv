import type { SessionRevokeReason } from '$lib/constants/session-policy';
import type { D1Compat } from '$lib/server/d1-compat';

export type SessionRevocationEventRecord = {
	id: string;
	memberId: string;
	sessionId: string;
	reason: SessionRevokeReason;
	actor: string;
	deviceLabel: string | null;
	ipAddress: string | null;
	createdAt: number;
};

function mapSessionRevocationEvent(row: Record<string, unknown>): SessionRevocationEventRecord {
	return {
		id: String(row.id),
		memberId: String(row.member_id),
		sessionId: String(row.session_id),
		reason: String(row.reason) as SessionRevokeReason,
		actor: String(row.actor),
		deviceLabel: row.device_label == null ? null : String(row.device_label),
		ipAddress: row.ip_address == null ? null : String(row.ip_address),
		createdAt: Number(row.created_at)
	};
}

export async function insertSessionRevocationEvent(
	db: D1Compat,
	data: {
		id: string;
		memberId: string;
		sessionId: string;
		reason: SessionRevokeReason;
		actor: string;
		deviceLabel?: string | null;
		ipAddress?: string | null;
		createdAt?: number;
	}
): Promise<void> {
	const createdAt = data.createdAt ?? Date.now();
	await db
		.prepare(
			`INSERT INTO session_revocation_events (
				id,
				member_id,
				session_id,
				reason,
				actor,
				device_label,
				ip_address,
				created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			data.id,
			data.memberId,
			data.sessionId,
			data.reason,
			data.actor,
			data.deviceLabel ?? null,
			data.ipAddress ?? null,
			createdAt
		)
		.run();
}

export async function listSessionRevocationEvents(
	db: D1Compat,
	memberId: string,
	limit = 50
): Promise<SessionRevocationEventRecord[]> {
	const result = await db
		.prepare(
			`SELECT id, member_id, session_id, reason, actor, device_label, ip_address, created_at
			 FROM session_revocation_events
			 WHERE member_id = ?
			 ORDER BY created_at DESC
			 LIMIT ?`
		)
		.bind(memberId, limit)
		.all<Record<string, unknown>>();

	return (result.results ?? []).map(mapSessionRevocationEvent);
}
