// TEAM_027: single motion module for the whole site (SITE_SCRIPT G.5).
// Reveal: IntersectionObserver, one-shot, ~80ms cascade between siblings
// (delay auto-computed from the element's index among [data-reveal]
// siblings — F-workers just mark blocks, no inline --d needed).
// transform/opacity only; prefers-reduced-motion → CSS shows everything
// and this observer still runs harmlessly (transition is disabled there).

const CASCADE_MS = 80;
const MAX_STAGGER = 8;

export function initReveal(root: ParentNode = document): void {
	const els = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
	if (!els.length) return;

	// Stagger per parent group: index of el within its parent's marked
	// children. An explicit inline --d (e.g. hero photo ~300ms) wins.
	for (const el of els) {
		if (el.style.getPropertyValue('--d')) continue;
		const parent = el.parentElement;
		if (!parent) continue;
		const sibs = Array.from(parent.querySelectorAll(':scope > [data-reveal]'));
		const i = Math.min(sibs.indexOf(el), MAX_STAGGER);
		el.style.setProperty('--d', `${Math.max(i, 0) * CASCADE_MS}ms`);
	}

	const io = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (e.isIntersecting) {
					e.target.classList.add('in');
					io.unobserve(e.target);
				}
			}
		},
		{ threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
	);
	els.forEach((el) => io.observe(el));
}

// Cover stack «capas apiladas» (G.5 — the ONE scroll-driven mechanism
// on the site): an entering .panel slides over a pinned .pin (≥80svh)
// while the departing layer dims to scale .97 / brightness .55 — never
// alpha-transparent, so nothing underneath can bleed through (BUG-1).
// rAF + CSS var --cover, armed/disarmed by IO at the boundaries.
// prefers-reduced-motion → .pin is static (CSS) and this never runs.
export function initCoverStack(root: ParentNode = document): void {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	const pairs = Array.from(root.querySelectorAll<HTMLElement>('.pin'))
		.map((pin) => ({ pin, cover: pin.nextElementSibling as HTMLElement | null }))
		.filter((p): p is { pin: HTMLElement; cover: HTMLElement } => !!p.cover);
	if (!pairs.length) return;

	const armed = new Set<HTMLElement>();
	const armIO = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (e.isIntersecting) armed.add(e.target as HTMLElement);
				else armed.delete(e.target as HTMLElement);
			}
		},
		{ rootMargin: '60% 0px 60% 0px' }
	);
	pairs.forEach((p) => armIO.observe(p.cover));

	let ticking = false;
	const update = (all = false) => {
		ticking = false;
		const vh = window.innerHeight;
		for (const { pin, cover } of pairs) {
			if (!all && !armed.has(cover)) continue;
			const top = cover.getBoundingClientRect().top;
			const span = Math.min(vh, pin.offsetHeight || vh);
			const progress = Math.min(1, Math.max(0, (vh - top) / span));
			pin.style.setProperty('--cover', progress.toFixed(3));
		}
	};
	const onScroll = () => {
		if (!ticking) {
			ticking = true;
			requestAnimationFrame(() => update());
		}
	};
	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', onScroll, { passive: true });
	update(true); // settle initial state before IO arms
}

// Lazy video + click-toggle (index S04 «ventana al obrador»):
// `data-src` stays unset until the IO fires — keeps ~700KB off the
// critical path. autoplay+muted+playsinline resumes on load.
// prefers-reduced-motion → src is never set, the poster stays (G.6).
// TEAM_028: a second, persistent IO pauses the decode loop once the
// scene leaves the viewport and resumes on return — unless the user
// paused it by click (click intent wins over auto-resume).
export function initLazyVideo(root: ParentNode = document): void {
	const vids = Array.from(root.querySelectorAll<HTMLVideoElement>('video[data-src]'));
	if (!vids.length) return;

	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (reduced) return; // poster-only scene — never load the mp4

	const pausedByUser = new WeakSet<HTMLVideoElement>();

	const vio = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (e.isIntersecting) {
					const v = e.target as HTMLVideoElement;
					v.src = v.dataset.src!;
					// src set dynamically: the autoplay attribute alone does not
					// (re)trigger playback — nudge it (muted+playsinline, so allowed).
					void v.play().catch(() => {});
					vio.unobserve(v);
				}
			}
		},
		{ rootMargin: '400px' }
	);
	vids.forEach((v) => vio.observe(v));

	// resource economy: pause when the scene leaves the viewport,
	// resume on return unless the user paused it by click.
	const vpause = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				const v = e.target as HTMLVideoElement;
				if (!v.src) continue;
				if (e.isIntersecting) {
					if (!pausedByUser.has(v)) void v.play().catch(() => {});
				} else {
					v.pause();
				}
			}
		},
		{ threshold: 0.15 }
	);
	vids.forEach((v) => vpause.observe(v));

	// click = pause/play (canon S04, no controls); noop while src unset
	vids.forEach((v) =>
		v.addEventListener('click', () => {
			if (!v.src) return;
			if (v.paused) {
				pausedByUser.delete(v);
				void v.play().catch(() => {});
			} else {
				pausedByUser.add(v);
				v.pause();
			}
		})
	);
}
