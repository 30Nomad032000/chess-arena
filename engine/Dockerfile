# ---------- builder ----------
FROM python:3.12-slim AS builder

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---------- production ----------
FROM python:3.12-slim

RUN groupadd -r arena && useradd -r -g arena -d /app -s /sbin/nologin arena

WORKDIR /app

COPY --from=builder /install /usr/local
COPY . .

RUN chown -R arena:arena /app
USER arena

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
