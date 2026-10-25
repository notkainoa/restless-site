// Generates the favicon, touch icon and Open Graph image from the brand SVGs
// in public/brand (copied from the app repo's icon/ folder).
//
//   npm run assets
//
// Outputs are committed, so builds don't need to run this.

import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url);
const pub = (p) => new URL(`public/${p}`, root);

const dark = await readFile(pub('brand/restless-dark.svg'), 'utf8');
const layers = Object.fromEntries(
  await Promise.all(
    ['background-dark', 'eye-dark', 'moon-dark'].map(async (n) => [
      n,
      await readFile(pub(`brand/layers/${n}.svg`), 'utf8'),
    ]),
  ),
);

const png = (svg, width) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();

// Inner markup of an <svg> file, with ids prefixed so two icons can share a document.
const inner = (svg, prefix) =>
  svg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/id="([^"]+)"/g, `id="${prefix}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`)
    .trim();

// Cropped to the tile so the mark fills small favicon slots.
const crop = (svg) => svg.replace('viewBox="0 0 1024 1024"', 'viewBox="96 96 832 832"');

// ---------------------------------------------------------------- favicon.svg
// The dark icon, cropped to its tile, to match the always-dark site.
await writeFile(pub('favicon.svg'), crop(dark).replace(/<!--[\s\S]*?-->\n?/g, ''));

// ---------------------------------------------------------------- favicon.ico
// PNG-in-ICO (supported everywhere that still asks for .ico).
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const dir = Buffer.alloc(16 * images.length);
  let offset = header.length + dir.length;
  images.forEach(({ size, data }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...images.map((i) => i.data)]);
}
const icoSource = crop(dark);
await writeFile(
  pub('favicon.ico'),
  ico([16, 32, 48].map((size) => ({ size, data: png(icoSource, size) }))),
);

// ------------------------------------------------------- apple-touch-icon.png
// Full-bleed square from the Icon Composer layers; iOS applies its own mask.
const touchSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  ${inner(layers['background-dark'], 'b')}
  <g transform="translate(512 512) scale(1.12) translate(-512 -512)">
    ${inner(layers['eye-dark'], 'e')}
    ${inner(layers['moon-dark'], 'm')}
  </g>
</svg>`;
await writeFile(pub('apple-touch-icon.png'), png(touchSvg, 180));

// -------------------------------------------------------------------- og.png
// The site's own look: near-black ground, off-white type, the hero headline,
// and the 1865 moon (public domain, Lewis Morris Rutherfurd) on the right.
const font = (weight) =>
  readFile(require.resolve(`@fontsource/hanken-grotesk/files/hanken-grotesk-latin-${weight}-normal.woff`));
const iconUri = `data:image/png;base64,${png(crop(dark), 160).toString('base64')}`;
const moonUri = `data:image/jpeg;base64,${(await readFile(pub('media/moon-1865.jpg'))).toString('base64')}`;

const h = (type, style, ...children) => ({ type, props: { style, children } });
const img = (src, style) => ({ type: 'img', props: { src, style } });

const og = await satori(
  h(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      backgroundColor: '#0e0e11',
      fontFamily: 'Hanken Grotesk',
      color: '#e8e7ee',
    },
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: 700,
        padding: '56px 0 56px 64px',
      },
      h(
        'div',
        { display: 'flex', alignItems: 'center', gap: 16, fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em' },
        img(iconUri, { width: 52, height: 52 }),
        'Restless',
      ),
      h(
        'div',
        { display: 'flex', flexDirection: 'column', fontSize: 96, fontWeight: 500, letterSpacing: '-0.05em', lineHeight: 0.95 },
        h('div', {}, 'Lid shut.'),
        h('div', {}, 'Still running.'),
      ),
      h(
        'div',
        { fontSize: 28, fontWeight: 400, lineHeight: 1.35, color: '#e8e7ee', maxWidth: 560 },
        'A macOS menu bar app that keeps your Mac awake with the lid closed.',
      ),
    ),
    img(moonUri, { width: 500, height: 630, objectFit: 'cover', objectPosition: '50% 40%' }),
  ),
  {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Hanken Grotesk', data: await font(400), weight: 400, style: 'normal' },
      { name: 'Hanken Grotesk', data: await font(500), weight: 500, style: 'normal' },
    ],
  },
);
await writeFile(pub('og.png'), png(og, 1200));

console.log('Wrote favicon.svg, favicon.ico, apple-touch-icon.png, og.png');
