const logger = require('../utils/logger');
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';

/**
 * Authentication and Role-Checking Middleware
 * 
 * Purpose: This Higher-Order Function wraps Lambda handlers. It parses the 
 * AWS Cognito claims injected by the API Gateway Authorizer, verifies group 
 * membership (Admin/Member), and injects a sanitized user object into the event.
 * 
 * Trade-offs: By wrapping the handler in code rather than relying 100% on 
 * API Gateway IAM Policies, we keep the deployment simpler and avoid hitting 
 * the 4KB header size limit for complex IAM role-chaining, but it adds approx
 * 1-2 milliseconds to Lambda invocation time.
 */

const requireRole = (allowedRoles = []) => (handler) => async (event, context) => {
    try {
        // API Gateway passes Cognito claims inside requestContext
        const claims = event.requestContext?.authorizer?.claims;
        
        if (!claims) {
            logger.warn('Unauthorized attempt: No claims found in request context');
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                    'Access-Control-Allow-Credentials': true
                },
                body: JSON.stringify({ error: 'Unauthorized: Missing token claims' })
            };
        }

        // Cognito stores user groups in 'cognito:groups'. Can be string or array
        let userGroups = claims['cognito:groups'] || [];
        if (typeof userGroups === 'string') {
            userGroups = userGroups.split(','); // Convert to array if comma-separated
        }

        // Role checking
        const hasRequiredRole = allowedRoles.some(role => userGroups.includes(role));
        
        if (!hasRequiredRole && allowedRoles.length > 0) {
            logger.warn('Forbidden attempt: Insufficient role', { 
                required: allowedRoles, 
                actual: userGroups, 
                user: claims.sub 
            });
            return {
                statusCode: 403,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                    'Access-Control-Allow-Credentials': true
                },
                body: JSON.stringify({ error: 'Forbidden: Insufficient privileges' })
            };
        }

        // Inject sanitized user context into event for the main handler to use
        event.user = {
            id: claims.sub,
            username: claims['cognito:username'] || claims.username,
            email: claims.email,
            groups: userGroups,
            tenantId: claims['custom:tenantId'] || 'DEFAULT_TENANT' // Multi-tenant extraction
        };

        // Execute the actual business logic handler
        return await handler(event, context);

    } catch (error) {
        logger.error('Middleware failure', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify({ error: 'Internal Server Error processing authorization' })
        };
    }
};

module.exports = { requireRole };
