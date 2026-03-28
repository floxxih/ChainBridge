FROM rust:1.77 as builder
WORKDIR /app

COPY Cargo.toml Cargo.toml
COPY src src
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/chainbridge-relayer /usr/local/bin/chainbridge-relayer

ENV RELAYER_METRICS_BIND=0.0.0.0:9108
EXPOSE 9108

CMD ["chainbridge-relayer"]
