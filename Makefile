.PHONY: install build watch test package package-openvsx install-vscode install-cursor install publish publish-vscode publish-openvsx release clean

install: install-cursor

# Reinstalls only when the lockfile is newer than the tree, so `npm ci` in CI is
# not followed by a redundant `npm install`.
node_modules: package-lock.json
	npm install
	@touch node_modules

install-deps: node_modules

build: node_modules
	npm run compile

watch: node_modules
	npm run watch

test: node_modules
	npm test

PKG_VERSION := $(shell node -p "require('./package.json').version")

# The two marketplaces use different publisher namespaces. A .vsix embeds its
# publisher, so each marketplace needs its own package.
PUBLISHER_VSCODE := remoteoss
PUBLISHER_OPENVSX := remote-com-oss

VSIX := dexter-lsp-$(PKG_VERSION).vsix
VSIX_OPENVSX := dexter-lsp-$(PKG_VERSION)-openvsx.vsix

package: build
	npx @vscode/vsce package --out $(VSIX)

# Repackages with the Open VSX publisher, then always restores package.json.
package-openvsx: build
	@set -e; \
	trap 'npm pkg set publisher=$(PUBLISHER_VSCODE)' EXIT; \
	npm pkg set publisher=$(PUBLISHER_OPENVSX); \
	npx @vscode/vsce package --out $(VSIX_OPENVSX)

install-vscode: package
	code --install-extension $(VSIX)

install-cursor: package
	cursor --install-extension $(VSIX)

# Needs VSCE_PAT. Publishes to the VS Code Marketplace as $(PUBLISHER_VSCODE).
publish-vscode: package
	npx @vscode/vsce publish --packagePath $(VSIX)

# Needs OVSX_PAT. Publishes to Open VSX (Cursor) as $(PUBLISHER_OPENVSX).
publish-openvsx: package-openvsx
	npx ovsx publish $(VSIX_OPENVSX)

publish: publish-vscode publish-openvsx

release:
	@if [ -z "$(VERSION)" ]; then echo "Usage: make release VERSION=0.3.0"; exit 1; fi
	@if [ "$(VERSION)" != "$(PKG_VERSION)" ]; then \
		echo "VERSION=$(VERSION) does not match package.json ($(PKG_VERSION)). Bump package.json first."; \
		exit 1; \
	fi
	@git tag v$(VERSION)
	@git push origin v$(VERSION)
	@echo "Tagged and pushed v$(VERSION)"

clean:
	rm -rf out/ node_modules/ *.vsix
