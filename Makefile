VAULT_ROOT ?= C:/Users/Egor/Documents/Заметки
PLUGIN_DIR := $(VAULT_ROOT)/.obsidian/plugins/dailies-tracker

.PHONY: help install build dev deploy clean reinstall test

.DEFAULT_GOAL := help

help:
	@echo Available targets:
	@echo   make help      - show this help
	@echo   make install   - npm install
	@echo   make build     - production build and copy to vault
	@echo   make dev       - watch mode for development
	@echo   make deploy    - alias for build
	@echo   make clean     - remove build artifacts
	@echo   make reinstall - clean, install, build
	@echo   make test      - run parser/sync logic tests
	@echo ""
	@echo Vault path is set in scripts/vault-config.mjs
	@echo Optional override: VAULT_ROOT=/path/to/vault make build

install:
	npm install

build:
	npm run build
	node scripts/copy-to-vault.mjs

dev:
	npm run dev

deploy: build

clean:
	rm -f main.js main.js.map

reinstall: clean install build

test:
	node scripts/test-logic.mjs
