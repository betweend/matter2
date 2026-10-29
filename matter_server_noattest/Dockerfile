FROM node:24-trixie-slim

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        iputils-ping \
        curl \
        python3 \
        make \
        gcc \
        g++ \
        bluez \
        systemd \
        libbluetooth-dev \
        libudev-dev \
        libcap2-bin \
    && setcap cap_net_raw+ep "$(command -v ping)" \
    && rm -rf /var/lib/apt/lists/*

COPY matterjs-server/ ./

RUN npm ci --foreground-scripts \
    && npm cache clean --force \
    && apt-get purge -y --auto-remove \
        python3 \
        make \
        gcc \
        g++ \
        libbluetooth-dev \
        libudev-dev \
        libcap2-bin \
    && rm -rf /var/lib/apt/lists/* /usr/src/* /root/.npm /root/.cache \
    && mkdir -p /data \
    && chown 1000:1000 /data

COPY run.mjs /usr/local/bin/run.mjs
RUN chmod 0755 /usr/local/bin/run.mjs

ENV LOG_LEVEL=info
ENV STORAGE_PATH=/data

EXPOSE 5581
VOLUME ["/data"]

USER root
ENTRYPOINT ["node", "/usr/local/bin/run.mjs"]
