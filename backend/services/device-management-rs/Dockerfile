FROM rust:1.93 as builder
WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/device-management-rs /usr/local/bin/device-management-rs
EXPOSE 3003
CMD ["device-management-rs"]
