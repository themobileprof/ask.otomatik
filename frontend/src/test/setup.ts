import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { HttpResponse, http } from 'msw';

// Define handlers for API mocking
const handlers = [
  http.get('http://localhost:4000/api/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),
  // Add more API mocks as needed
];

// Setup MSW server for API mocking
const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close()); 