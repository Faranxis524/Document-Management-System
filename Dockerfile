# Stage 1 – build the React frontend
FROM node:20-alpine AS build-frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY public ./public
COPY src ./src
RUN npm run build

# Stage 2 – production server
FROM node:20-alpine AS server
WORKDIR /app

# Install server dependencies
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server source
COPY server ./server

# Copy the built frontend so Express can serve it
COPY --from=build-frontend /app/build ./build

WORKDIR /app/server

# Persistent data lives in a Docker volume mounted at /app/server/data and /app/server/uploads
ENV NODE_ENV=production \
    PORT=5000 \
    SQLITE_PATH=./data/dms.sqlite \
    UPLOAD_DIR=./uploads

EXPOSE 5000

CMD ["node", "index.js"]
