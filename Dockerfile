FROM node:20-alpine

WORKDIR /app

# Copy dependency definition and bundled errtrace package
COPY package*.json ./
COPY packages/ ./packages/
COPY errtrace-1.0.0.tgz ./

# Install dependencies (links local errtrace package)
RUN npm install --omit=dev

# Copy application source code
COPY server.js ./
COPY express-example.js ./
COPY src/ ./src/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
