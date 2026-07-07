# 🐳 slime-docker — the container that used to be a metaphor
FROM node:24-alpine

# ssh-keygen for first-boot host key generation (into the /data volume,
# so the key — and therefore the visitor's known_hosts trust — survives rebuilds)
RUN apk add --no-cache openssh-keygen

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY server.js entrypoint.sh ./

# run as the unprivileged node user; /data holds host key + visitor counter
RUN mkdir -p /data && chown node:node /data
USER node
ENV DATA_DIR=/data HOST_KEY=/data/host_ed25519 PORT=2222

EXPOSE 2222
VOLUME /data
ENTRYPOINT ["sh", "/app/entrypoint.sh"]
