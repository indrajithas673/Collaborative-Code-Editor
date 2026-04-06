# Build the Frontend [dist folder]
# Copy the dist folder content in Backend/public folder

FROM node:20-alpine as frontend-builder

COPY ./Frontend /app
WORKDIR /app

RUN npm install
ENV NODE_OPTIONS=--max_old_space_size=2048
RUN npm run build

# Build the Backend
FROM node:20-alpine

COPY ./Backend /app
WORKDIR /app

RUN npm install

# Copy frontend build to backend public folder
COPY --from=frontend-builder /app/dist /app/public

# Environment variables that should be provided at runtime:
# MONGODB_URI=mongodb://localhost:27017/collab-editor
# JWT_SECRET=your_jwt_secret_key
# PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]