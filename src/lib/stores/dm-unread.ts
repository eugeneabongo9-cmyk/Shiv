import { writable } from 'svelte/store';

/**
 * Process-wide store for the viewer's unread DM total. The sidebar
 * badge subscribes to this, and DmListener writes to it on incoming
 * `dm.created` events / read receipts so the badge stays live.
 *
 * At launch this stays at 0 — DmListener isn't ported yet (messages
 * page is still a ComingSoon stub). The store exists so the Sidebar
 * can subscribe to it without throwing.
 */
export const dmUnreadStore = writable<number>(0);
