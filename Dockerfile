FROM oven/bun:latest
COPY . .
ENTRYPOINT ["bun",  "./index.ts"]