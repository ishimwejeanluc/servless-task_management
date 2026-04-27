/**
 * Structured Logging Utility
 * Purpose: Ensures all Lambda logs adhere to a consistent JSON schema for CloudWatch Insights querying.
 */

const logger = {
    info: (message, context = {}) => {
        console.log(JSON.stringify({
            level: 'INFO',
            timestamp: new Date().toISOString(),
            message,
            ...context
        }));
    },
    warn: (message, context = {}) => {
        console.warn(JSON.stringify({
            level: 'WARN',
            timestamp: new Date().toISOString(),
            message,
            ...context
        }));
    },
    error: (message, error, context = {}) => {
        console.error(JSON.stringify({
            level: 'ERROR',
            timestamp: new Date().toISOString(),
            message,
            errorMessage: error?.message || 'Unknown error',
            stack: error?.stack,
            ...context
        }));
    }
};

module.exports = logger;
