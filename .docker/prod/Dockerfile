# Build from repo root (see docker-compose.yml context: .) so file:../sdks/react resolves.
FROM node:22-alpine AS builder
WORKDIR /app/dashboard
COPY dashboard/package*.json ./
# file:../sdks/react in package.json resolves from /app/dashboard → /app/sdks/react
COPY sdks/react /app/sdks/react
RUN npm ci
COPY dashboard/ .

ARG NEXT_PUBLIC_API_URL=https://api.example.com/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

FROM node:22-alpine
WORKDIR /app/dashboard
ENV NODE_ENV=production
COPY --from=builder /app/dashboard ./
EXPOSE 3000
CMD ["npm", "run", "start"]
