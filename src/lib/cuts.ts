// TEAM_027: registry of prepared cut assets (site/src/assets/cut/, produced
// by DULCEA_V3_P1). URLs resolved via import.meta.glob ?url — files are
// already sized/encoded, no re-optimization. w/h = intrinsic px of the
// largest derivative (from MANIFEST + magick identify). alt_es comes from
// ASSET_MAP; components may override via sections.json copy.
import manifest from '../assets/real/manifest.json';

const files = import.meta.glob<string>('../assets/real/*.{avif,webp,jpg}', {
	eager: true,
	import: 'default',
	query: '?url',
});

export interface CutVariant {
	url: string;
	width: number;
}

export interface Cut {
	base: string;
	avif: CutVariant[];
	webp: CutVariant[];
	jpg: string; // fallback <img src>
	width: number; // intrinsic of the largest derivative
	height: number;
}

// slot → intrinsic size of its LARGEST derivative (magick identify, disk)
const SIZES: Record<string, [number, number]> = {
	'hero-card': [504, 623],
	'corte-band': [1376, 154],
	'card-1-nocilla-barritas': [305, 308],
	'card-2-filipinos': [305, 308],
	'queso-diptych': [715, 630],
	'tu-porcion': [730, 537],
	'reel-poster': [720, 960],
	'nocilla-pair-main': [426, 589],
	'nocilla-pair-second': [372, 488], // TEAM_037: photobank top-view, наклон запечённый в RAW убран
	'filipinos-pair-entera': [464, 598],
	'filipinos-pair-porcion': [565, 646],
	'barritas-figura': [569, 435],
	'barritas-satelite': [493, 554],
	'queso-shelf-entera': [540, 708],
	'queso-shelf-porcion': [540, 708],
	'pastelera-foto-margen': [224, 256],
	'fotograma-1': [455, 324],
	'fotograma-2': [455, 324],
	'fotograma-3': [434, 329],
	'mini-carta-foto': [730, 537],
	'entrada-anchor': [540, 709],
	'paso-2': [466, 614],
	'paso-3': [542, 640],
	'redactor-texture': [503, 456],
	'rail-anchor': [493, 554],
	'intro-sticker': [464, 598],
	'acordeon-aside': [540, 709],
	// TEAM_044 / DULCEA_V4_FX2: аддитивные слоты (Q1-12/Q1-13)
	'queso-entera-warm': [640, 514], // тёплая градация photobank entera
	'filipinos-alt': [430, 365],     // porción-зона внутри рамки remove_text
	'capas-macro': [800, 263],       // макро страт, нижняя зона листа
};

const sources: Record<string, string> = manifest.slots;
const photos: Record<string, { width: number; height: number; source: string }> = manifest.photos;
for (const slot of Object.keys(SIZES)) {
	const photo = photos[sources[slot]];
	if (!photo) throw new Error(`[cuts] missing real photograph for "${slot}"`);
	SIZES[slot] = [photo.width, photo.height];
}

function variants(base: string, ext: 'avif' | 'webp'): CutVariant[] {
	const out: CutVariant[] = [];
	for (const [path, url] of Object.entries(files)) {
		// `${base}-<w>.<ext>` or suffix-less `${base}.<ext>` (reel-poster)
		const m = path.match(new RegExp(`/${sources[base]}(?:-(\\d+))?\\.${ext}$`));
		if (m) out.push({ url, width: Number(m[1] ?? SIZES[base]?.[0] ?? 0) });
	}
	return out.sort((a, b) => a.width - b.width);
}

const cache = new Map<string, Cut>();

export function getCut(base: string): Cut {
	const hit = cache.get(base);
	if (hit) return hit;
	const size = SIZES[base];
	const jpgUrl = Object.entries(files).find(([p]) =>
		new RegExp(`/${sources[base]}(?:-${size?.[0] ?? 0})?\\.jpg$`).test(p)
	)?.[1];
	if (!size || !jpgUrl) throw new Error(`[cuts] unknown slot "${base}"`);
	const cut: Cut = {
		base,
		avif: variants(base, 'avif'),
		webp: variants(base, 'webp'),
		jpg: jpgUrl,
		width: size[0],
		height: size[1],
	};
	cache.set(base, cut);
	return cut;
}
