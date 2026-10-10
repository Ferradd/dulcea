import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = new URL('../../photobank/', import.meta.url);
const destination = new URL('../src/assets/real/', import.meta.url);
const slots = {
  'hero-card': 'obleas-nocilla-porcion',
  'corte-band': 'obleas-corte',
  'card-1-nocilla-barritas': 'obleas-barritas',
  'card-2-filipinos': 'filipinos-entera',
  'queso-diptych': 'queso-porcion',
  'tu-porcion': 'filipinos-porcion',
  'reel-poster': 'reel-frame-1',
  'nocilla-pair-main': 'obleas-nocilla-porcion',
  'nocilla-pair-second': 'obleas-nocilla-top',
  'filipinos-pair-entera': 'filipinos-entera',
  'filipinos-pair-porcion': 'filipinos-porcion',
  'barritas-figura': 'obleas-corte',
  'barritas-satelite': 'obleas-barritas',
  'queso-shelf-entera': 'queso-entera',
  'queso-shelf-porcion': 'queso-porcion',
  'pastelera-foto-margen': 'reel-frame-1',
  'fotograma-1': 'reel-frame-1',
  'fotograma-2': 'reel-frame-4',
  'fotograma-3': 'reel-frame-6',
  'mini-carta-foto': 'filipinos-porcion',
  'entrada-anchor': 'queso-entera',
  'paso-2': 'reel-frame-2',
  'paso-3': 'obleas-nocilla-porcion',
  'redactor-texture': 'obleas-corte',
  'rail-anchor': 'queso-entera',
  'intro-sticker': 'filipinos-entera',
  'acordeon-aside': 'queso-entera',
  'queso-entera-warm': 'queso-entera',
  'filipinos-alt': 'filipinos-porcion',
  'capas-macro': 'obleas-corte',
};
await mkdir(destination, { recursive: true });
const manifest = {};
for (const name of new Set(Object.values(slots))) {
  const input = fileURLToPath(new URL(`${name}.jpg`, source));
  const crop = name === 'queso-entera' ? { left: 0, top: 180, width: 704, height: 600 } : null;
  const { width, height } = crop ?? await sharp(input).metadata();
  for (const size of [400, width]) {
    for (const format of ['avif', 'webp', 'jpg']) {
      const image = sharp(input).rotate();
      if (crop) image.extract(crop);
      await image.resize({ width: size, withoutEnlargement: true })
        .toFormat(format, { quality: format === 'avif' ? 58 : 84 })
        .toFile(fileURLToPath(new URL(`${name}-${size}.${format}`, destination)));
    }
  }
  manifest[name] = { width, height, source: `photobank/${name}.jpg`, crop };
}
await writeFile(new URL('manifest.json', destination), JSON.stringify({ slots, photos: manifest }, null, 2) + '\n');
console.log(`Prepared ${Object.keys(manifest).length} real photographs for ${Object.keys(slots).length} slots.`);
