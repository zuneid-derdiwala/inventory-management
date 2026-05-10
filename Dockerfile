# Build Vite SPA, serve with nginx (same SPA routing as vercel.json rewrites).
# Build-time env: pass via docker-compose `build.args` (from your `.env`).

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_HCAPTCHA_SITE_KEY
ARG GROQ_ENABLED
ARG GROQ_MODEL

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_HCAPTCHA_SITE_KEY=$VITE_HCAPTCHA_SITE_KEY
ENV GROQ_ENABLED=$GROQ_ENABLED
ENV GROQ_MODEL=$GROQ_MODEL

RUN npm run build

FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
