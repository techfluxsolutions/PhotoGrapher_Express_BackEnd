/**
 * Error classification system to determine which errors are retryable
 */
export const isRetryableError = (error) => {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'EADDRINUSE' || error.name === 'TimeoutError') {
        return true;
    }

    // AWS specific retryable errors (Status codes 500, 503, etc.)
    if (error.$metadata) {
        const status = error.$metadata.httpStatusCode;
        if (status === 500 || status === 502 || status === 503 || status === 504 || status === 429) {
            return true;
        }
    }

    // Explicitly non-retryable errors
    const nonRetryableMessages = [
        'InvalidAccessKeyId',
        'SignatureDoesNotMatch',
        'AccessDenied',
        'NoSuchBucket',
        'EntityTooLarge'
    ];

    if (nonRetryableMessages.some(msg => error.name?.includes(msg) || error.message?.includes(msg))) {
        return false;
    }

    return false;
};

/**
 * Exponential backoff with jitter
 */
export const getWaitTime = (attempt, baseWait = 1000) => {
    const exponentialWait = baseWait * Math.pow(2, attempt);
    // Add jitter (up to 20% variability)
    const jitter = Math.random() * 0.2 * exponentialWait;
    return exponentialWait + jitter;
};

/**
 * Enhanced withRetry utility with exponential backoff and jitter
 */
export const withRetry = async (fn, options = {}) => {
    const {
        maxAttempts = 3,
        baseWait = 1000,
        onRetry = (err, attempt) => console.log(`Retry attempt ${attempt} due to: ${err.message}`),
        circuitBreaker = null
    } = options;

    let lastError;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            if (circuitBreaker && !circuitBreaker.allowRequest()) {
                throw new Error('Circuit breaker is OPEN');
            }

            const result = await fn();
            
            if (circuitBreaker) circuitBreaker.recordSuccess();
            return result;

        } catch (error) {
            lastError = error;
            
            if (circuitBreaker) circuitBreaker.recordFailure();

            if (!isRetryableError(error) || attempt === maxAttempts - 1) {
                throw error;
            }

            onRetry(error, attempt + 1);
            const waitTime = getWaitTime(attempt, baseWait);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    throw lastError;
};

/**
 * Simple Circuit Breaker implementation
 */
export class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
        this.failures = 0;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.lastFailureTime = null;
    }

    allowRequest() {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.resetTimeout) {
                this.state = 'HALF_OPEN';
                return true;
            }
            return false;
        }
        return true;
    }

    recordSuccess() {
        this.failures = 0;
        this.state = 'CLOSED';
    }

    recordFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.failureThreshold) {
            this.state = 'OPEN';
            console.warn(`Circuit Breaker is now OPEN due to ${this.failures} consecutive failures.`);
        }
    }
}
