# Testing Guide for Aisle3

This document provides comprehensive information about testing the Aisle3 email client application.

## Overview

Aisle3 uses a multi-layered testing approach covering:

- **Unit Tests**: Individual component and function testing
- **Integration Tests**: Full application flow testing  
- **Rust Backend Tests**: Gmail client and Tauri command testing
- **Component Tests**: Svelte component behavior testing
- **Store Tests**: State management testing
- **Service Tests**: API service layer testing

## Prerequisites

```bash
# Install Node.js dependencies
npm install

# Install Rust testing dependencies
cd src-tauri
cargo build
```

## Running Tests

### Frontend Tests

```bash
# Run all frontend tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:components      # Component tests only
npm run test:stores         # Store tests only  
npm run test:services       # Service tests only
npm run test:integration    # Integration tests only

# Run tests with UI
npm run test:ui
```

### Rust Backend Tests

```bash
# Run all Rust tests
npm run test:rust

# Run Rust tests in watch mode (requires cargo-watch)
npm run test:rust:watch

# Run Rust tests directly
cd src-tauri && cargo test

# Run with verbose output
cd src-tauri && cargo test -- --nocapture
```

### All Tests

```bash
# Run both frontend and backend tests
npm run test:all
```

## Test Structure

```
src/
├── tests/
│   ├── __mocks__/           # Mock implementations
│   │   └── tauri.js         # Tauri API mocks
│   ├── components/          # Component tests
│   │   ├── EmailList.test.js
│   │   ├── EmailViewer.test.js
│   │   ├── Header.test.js
│   │   └── Settings.test.js
│   ├── stores/              # Store tests
│   │   └── emailStore.test.js
│   ├── services/            # Service tests
│   │   └── emailService.test.js
│   └── integration/         # Integration tests
│       └── app.test.js
└── setupTests.js           # Test setup and global mocks

src-tauri/tests/
├── gmail_client_tests.rs   # Gmail client unit tests
└── tauri_commands_tests.rs # Tauri command tests
```

## Writing Tests

### Component Tests

```javascript
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import MyComponent from '../MyComponent.svelte';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(MyComponent, { props: { title: 'Test' } });
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const mockHandler = vi.fn();
    render(MyComponent, { props: { onClick: mockHandler } });
    
    await fireEvent.click(screen.getByRole('button'));
    expect(mockHandler).toHaveBeenCalled();
  });
});
```

### Store Tests

```javascript
import { get } from 'svelte/store';
import { myStore, myOperations } from '../stores/myStore.js';

describe('MyStore', () => {
  beforeEach(() => {
    myStore.set(initialState);
  });

  it('updates state correctly', () => {
    myOperations.updateData(newData);
    expect(get(myStore)).toEqual(expectedState);
  });
});
```

### Rust Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_function() {
        let result = my_function("input");
        assert_eq!(result, "expected_output");
    }

    #[tokio::test]
    async fn test_async_function() {
        let result = my_async_function().await;
        assert!(result.is_ok());
    }
}
```

## Mocking

### Tauri API Mocking

The test setup automatically mocks the Tauri API. You can customize responses:

```javascript
import { invoke } from '@tauri-apps/api/core';

// Mock successful response
invoke.mockResolvedValue(mockData);

// Mock error response
invoke.mockRejectedValue(new Error('API Error'));

// Reset mocks
invoke.mockReset();
```

### HTTP Mocking (Rust)

```rust
use mockito::{Server, Mock};

#[tokio::test]
async fn test_api_call() {
    let mut server = Server::new_async().await;
    let mock = server.mock("GET", "/api/endpoint")
        .with_status(200)
        .with_body("response")
        .create_async()
        .await;

    // Test your code that makes HTTP requests
    
    mock.assert_async().await;
}
```

## Test Data

Mock data is centralized in `src/tests/__mocks__/tauri.js`:

```javascript
export const mockEmails = [
  {
    id: 'email1',
    subject: 'Test Email',
    sender: 'test@example.com',
    is_read: false
    // ... other fields
  }
];
```

## Coverage Reports

Coverage reports are generated automatically:

- **Frontend**: `coverage/` directory with HTML reports
- **Backend**: Terminal output with line-by-line coverage

### Viewing Coverage

```bash
# Generate and view frontend coverage
npm run test:coverage
open coverage/index.html

# Generate Rust coverage (requires cargo-tarpaulin)
cd src-tauri
cargo install cargo-tarpaulin
cargo tarpaulin --out html
open tarpaulin-report.html
```

## Continuous Integration

GitHub Actions automatically run tests on:

- Push to `main` or `develop` branches
- Pull requests to `main`
- Multiple Node.js versions (18, 20)
- Multiple platforms (Ubuntu, macOS, Windows)

The CI pipeline includes:
- Frontend tests and linting
- Rust tests and formatting
- Security audits
- Build verification
- Coverage reporting

## Debugging Tests

### Frontend

```bash
# Run specific test file
npx vitest run src/tests/components/EmailList.test.js

# Run tests matching pattern
npx vitest run --reporter=verbose --grep "email list"

# Debug with browser tools
npm run test:ui
```

### Rust

```bash
# Run specific test
cd src-tauri && cargo test test_function_name

# Run with output
cd src-tauri && cargo test -- --nocapture

# Run with backtrace
cd src-tauri && RUST_BACKTRACE=1 cargo test
```

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the component does, not how it does it
2. **Use Descriptive Test Names**: Test names should clearly describe what is being tested
3. **Keep Tests Isolated**: Each test should be independent and not rely on others
4. **Mock External Dependencies**: Use mocks for Tauri APIs, HTTP requests, etc.
5. **Test Edge Cases**: Include tests for error conditions and boundary cases
6. **Maintain Test Data**: Keep mock data realistic and up-to-date

## Troubleshooting

### Common Issues

**Tests fail with "invoke is not a function"**
- Ensure Tauri mocks are properly imported in test setup

**Rust tests fail to compile**
- Check that test dependencies are installed: `cd src-tauri && cargo build`

**Tests timeout**
- Increase timeout in vitest config or use `--testTimeout` flag

**Coverage not generating**
- Ensure c8 or cargo-tarpaulin is installed

### Getting Help

- Check the test output for specific error messages
- Review similar tests for patterns
- Ensure all dependencies are installed
- Verify test environment setup in `setupTests.js`

## Performance Testing

For performance testing, consider:

- Load testing with large email datasets
- Memory usage monitoring
- Response time measurement
- Gmail API rate limiting simulation

```javascript
// Example performance test
it('handles large email lists efficiently', async () => {
  const largeEmailList = generateMockEmails(1000);
  
  const startTime = Date.now();
  render(EmailList, { props: { emails: largeEmailList } });
  const endTime = Date.now();
  
  expect(endTime - startTime).toBeLessThan(1000); // Should render in under 1 second
});
```