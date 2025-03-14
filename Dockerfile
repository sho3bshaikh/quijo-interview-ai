FROM oven/bun:latest
COPY . .
RUN bun install
ENTRYPOINT ["bun",  "./index.ts"]