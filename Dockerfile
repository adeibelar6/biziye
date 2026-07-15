# ── Compilación ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS compilacion
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit
COPY . .
RUN npm run build && npm prune --omit=dev

# ── Imagen final ──────────────────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=compilacion /app/build ./build
COPY --from=compilacion /app/node_modules ./node_modules
COPY --from=compilacion /app/drizzle ./drizzle
COPY --from=compilacion /app/package.json ./package.json
EXPOSE 3000
CMD ["node", "build/index.js"]
