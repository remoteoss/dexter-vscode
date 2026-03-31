.PHONY: install build watch package install-vscode install-cursor install clean

install: install-cursor

install-deps:
	npm install

build: install-deps
	npm run compile

watch: install-deps
	npm run watch

package: build
	npx vsce package

VSIX := dexter-vscode-$(shell node -p "require('./package.json').version").vsix

install-vscode: package
	code --install-extension $(VSIX)

install-cursor: package
	cursor --install-extension $(VSIX)

release:
	@if [ -z "$(VERSION)" ]; then echo "Usage: make release VERSION=0.2.0"; exit 1; fi
	@npm version $(VERSION) --no-git-tag-version
	@git add package.json package-lock.json
	@git commit -m "Release v$(VERSION)"
	@git tag v$(VERSION)
	@git push origin main v$(VERSION)
	@echo "Released v$(VERSION)"

clean:
	rm -rf out/ node_modules/ *.vsix
