# Aisle3 - Gmail Client

A modern, secure Gmail client built with Tauri and SvelteKit.

## Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS version)
- [Rust](https://rustup.rs/)
- [VS Code](https://code.visualstudio.com/) with recommended extensions:
  - [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)
  - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Getting Started
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Testing

```bash
# Run all tests
npm run test:all

# Run JavaScript/Svelte tests only
npm run test:run

# Run Rust tests only
npm run test:rust

# Run specific test suites
npm run test:components
npm run test:services
npm run test:integration
```

## Release Process

### Pre-Release Check
Before releasing, run the comprehensive release readiness check:

```bash
npm run release:check
```

This command will:
- ✅ Check Rust formatting (`cargo fmt --check`)
- ✅ Run Rust linting (`cargo clippy`)
- ✅ Validate TypeScript/Svelte code (`npm run check`)
- ✅ Run all Rust tests (`cargo test`)
- ✅ Run all JavaScript/Svelte tests (`npm run test:run`)
- ⚠️  Check git status (warns about uncommitted changes)

### Creating Releases

```bash
# Patch release (0.3.0 → 0.3.1)
npm run release:patch

# Minor release (0.3.0 → 0.4.0)
npm run release:minor

# Major release (0.3.0 → 1.0.0)
npm run release:major

# Specific version
npm run release 1.2.3
```

The release process will:
1. Update version numbers in all relevant files
2. Create a git commit and tag
3. Push to GitHub
4. Trigger GitHub Actions to build and publish releases
