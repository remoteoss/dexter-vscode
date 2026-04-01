.PHONY: install build watch package install-vscode install-cursor install clean

install: install-cursor

install-deps:
	npm install

build: install-deps
	npm run compile

watch: install-deps
	npm run watch

package: build
	npx @vscode/vsce package

VSIX := dexter-vscode-$(shell node -p "require('./package.json').version").vsix

install-vscode: package
	code --install-extension $(VSIX)

install-cursor: package
	cursor --install-extension $(VSIX)

release:
	@if [ -z "$(VERSION)" ]; then echo "Usage: make release VERSION=0.2.0"; exit 1; fi
	@git tag v$(VERSION)
	@git push origin v$(VERSION)
	@echo "Tagged and pushed v$(VERSION)"

clean:
	rm -rf out/ node_modules/ *.vsix
