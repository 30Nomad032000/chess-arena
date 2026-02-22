.PHONY: dev up down engine server frontend migrate

up:
	docker compose up --build

down:
	docker compose down

dev:
	$(MAKE) -j3 engine server frontend

engine:
	cd engine && uvicorn main:app --reload --host 0.0.0.0 --port 8080

server:
	cd server && npm run dev

frontend:
	cd frontend && npm run dev

migrate:
	cd server && npm run migrate
