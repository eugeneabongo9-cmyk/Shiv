const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function parseDateTimeLocal(
	value: string | null | undefined,
	timezoneOffsetMinutes: number
): number | null {
	if (!value) return null;
	const match = LOCAL_DATE_TIME_PATTERN.exec(value);
	if (!match || !Number.isFinite(timezoneOffsetMinutes)) return null;

	const [, year, month, day, hour, minute, second = '0'] = match;
	const localAsUtc = Date.UTC(
		Number(year),
		Number(month) - 1,
		Number(day),
		Number(hour),
		Number(minute),
		Number(second)
	);
	const epoch = localAsUtc + timezoneOffsetMinutes * 60_000;
	return Number.isFinite(epoch) ? epoch : null;
}

export function formatScheduleForEmail(value: number): string {
	return new Intl.DateTimeFormat('en-US', {
		timeZone: 'UTC',
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		timeZoneName: 'short'
	}).format(new Date(value));
}
