import { afterNavigate, onNavigate } from '$app/navigation';

const EXIT_MS = 230;

function reducedMotion(): boolean {
	const doc = document.documentElement;
	if (doc.getAttribute('data-motion') === 'reduced') return true;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function hasAppShell(): boolean {
	return Boolean(document.querySelector('.sidebar-main'));
}

function startBar(): HTMLDivElement | null {
	if (reducedMotion()) return null;
	const bar = document.createElement('div');
	bar.className = 'pf-bar';
	bar.setAttribute('aria-hidden', 'true');
	document.body.appendChild(bar);
	requestAnimationFrame(() => {
		bar.style.transform = 'scaleX(0.75)';
	});
	return bar;
}

function removeBar(bar: HTMLDivElement | null): void {
	bar?.remove();
}

function playEntrance(): void {
	const doc = document.documentElement;
	doc.classList.remove('pflow-leaving');
	if (!hasAppShell() || reducedMotion()) {
		doc.classList.remove('pflow');
		return;
	}
	doc.classList.remove('pflow');
	void doc.offsetWidth;
	doc.classList.add('pflow');
}

let activeBar: HTMLDivElement | null = null;
let initialized = false;

/** Harness-style page entrance + exit transitions for the member app shell. */
export function initPageflow(): void {
	if (initialized || typeof document === 'undefined') return;
	initialized = true;

	playEntrance();

	onNavigate((navigation) => {
		if (!hasAppShell() || reducedMotion()) return;
		if (navigation.willUnload) return;

		const doc = document.documentElement;
		doc.classList.remove('pflow');
		doc.classList.add('pflow-leaving');
		removeBar(activeBar);
		activeBar = startBar();

		return new Promise<void>((resolve) => {
			window.setTimeout(resolve, EXIT_MS);
		});
	});

	afterNavigate(() => {
		removeBar(activeBar);
		activeBar = null;
		playEntrance();
	});

	window.addEventListener('pageshow', (event) => {
		document.documentElement.classList.remove('pflow-leaving');
		removeBar(activeBar);
		activeBar = null;
		if ((event as PageTransitionEvent).persisted) {
			playEntrance();
		}
	});
}
