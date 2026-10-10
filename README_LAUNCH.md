# dulcea-site — запуск и правки

Astro 7 + Tailwind v4, статика. Node 22.

```bash
cd site
npm install        # один раз
npm run dev        # dev-сервер (astro dev)
npm run build      # прод-сборка → dist/
npm run preview -- --port 4777   # сервить dist/ на :4777
```

Роуты: `/` `/tartas/` `/sobre/` `/como-encargar/` `/contacto/` `/faq/`
(старый `/tortas/` мёртв — 404).

## Тексты

Весь публичный копирайт — в `src/data/sections.json`
(ключи: `global`, `index`, `tartas`, `sobre`, `como-encargar`,
`contacto`, `faq`). Правишь строку → `npm run build` → готово.
Alt-тексты картинок тоже там.

## Фото

- `src/assets/cut/` — нарезанные кадры (avif/webp/jpg × размеры).
  Слоты и srcset описаны в `src/lib/cuts.ts`. Замена фото: положить
  файлы с теми же именами в `src/assets/cut/`, при новом размере —
  поправить `SIZES` в `cuts.ts`.
- `public/img/` — производные фотобанка (отдаются как есть).

## Форма обратной связи (contacto S02)

Секция «¿Lo prefieres por escrito?» рендерится ТОЛЬКО если задан
`PUBLIC_FORM_ENDPOINT` (Formspree/Web3Forms URL, принимает POST
FormData). Без переменной секции нет в HTML — это задумано (MF-3).

```bash
cp .env.example .env   # и вписать endpoint
```

## Проверка перед отдачей

```bash
npm run build                                  # 0 ошибок
npm run preview -- --port 4777 &               # фон
for r in / /tartas/ /sobre/ /como-encargar/ /contacto/ /faq/; do
  curl -s -o /dev/null -w "$r %{http_code}\n" http://localhost:4777$r
done                                           # все 200
```
