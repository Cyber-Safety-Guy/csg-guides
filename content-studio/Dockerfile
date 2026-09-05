FROM node:20-slim
WORKDIR /app

# Python + system deps
RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Python packages
RUN pip3 install playwright python-pptx --break-system-packages

# Playwright Chromium + its system dependencies
RUN playwright install chromium
RUN playwright install-deps chromium

COPY package.json .
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
