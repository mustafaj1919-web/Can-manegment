# Stage 1: Install dependencies and build
FROM node:20-alpine3.19 AS builder
WORKDIR /app

# Add libc6-compat for node/alpine compatibility
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Set build environment variables
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Run build process which outputs standalone folder
RUN npm run build

# Stage 2: Run application
FROM node:20-alpine3.19 AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# تحديث الحزم لسد الثغرات الأمنية
RUN apk update && apk upgrade --no-cache

# Create unprivileged system user for execution
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Copy built standalone server and static resources with correct owner permissions
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
