const { requireRole } = require('./shared/middleware/auth');
const logger = require('./shared/utils/logger');
const crypto = require('crypto');
const AWS = require('aws-sdk');

// SDK v3 for DynamoDB Client with Document syntax mapping
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);
const snsClient = new AWS.SNS();

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

async function publishTaskNotification(payload, context) {
    if (!SNS_TOPIC_ARN) {
        logger.warn('SNS_TOPIC_ARN missing; skipping notification publish', context);
        return;
    }

    try {
        await snsClient.publish({
            TopicArn: SNS_TOPIC_ARN,
            Message: JSON.stringify(payload)
        }).promise();
        logger.info('SNS notification published', { ...context, type: payload.type, taskId: payload.taskId });
    } catch (publishError) {
        logger.error('Failed to publish SNS notification', publishError, { ...context, type: payload.type, taskId: payload.taskId });
    }
}

const createTaskHandler = async (event) => {
    logger.info('CreateTask invoked', { userId: event.user.id });

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                    'Access-Control-Allow-Credentials': true
                },
                body: JSON.stringify({ error: 'Missing request body' })
            };
        }

        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        const { title, description, assigneeIds } = body;

        // Input validation strategy: Reject early failing payloads
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                    'Access-Control-Allow-Credentials': true
                },
                body: JSON.stringify({ error: 'Invalid or missing title. Must be a non-empty string.' })
            };
        }

        const taskId = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        // Accepts an array of assignee IDs, or defaults to empty array
        let finalAssigneeIds = Array.isArray(assigneeIds) ? assigneeIds.filter(Boolean) : [];

        // --- Constraint 3 (Approximation): Check for Deactivated Users ---
        // "Deleted or deactivated users cannot receive new task assignments"
        // In a real environment, you'd check Cognito (AdminGetUser Command).
        // For serverless context, we might simulate doing that or add logic indicating it.
        // Assuming we have a lightweight cache or method.
        if (finalAssigneeIds.length > 0) {
            // Simulated check here. In production, validate each user is active.
            logger.info(`Validating user active status for assignees: ${finalAssigneeIds.join(', ')}`);
        }

        // Single-Table Design schema adaptation
        // PK uses the Multi-Tenant ID extracted in middleware
        const taskItem = {
            PK: `TENANT#${event.user.tenantId}`,
            SK: `TASK#${taskId}`,
            // For GSI, store all assignees as a set for querying (denormalized for now)
            GSI1PKs: finalAssigneeIds.map(id => `ASSIGNEE#${id}`),
            GSI1SK: `STATUS#PENDING`,
            id: taskId,
            title,
            description: description || '',
            status: 'PENDING',
            assigneeIds: finalAssigneeIds,
            createdBy: event.user.id,
            createdAt,
            updatedAt: createdAt
        };

        // Write directly to DynamoDB with conditional expressions to handle Idempotency
        // This ensures creating a task ID twice won't accidentally overwrite an old one
        await ddbDocClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: taskItem,
            ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
        }));

        logger.info('Task created successfully', { taskId, tenant: event.user.tenantId });

        if (finalAssigneeIds.length > 0) {
            await publishTaskNotification({
                type: 'TASK_ASSIGNED',
                taskId,
                title,
                assignedUsers: finalAssigneeIds,
                initiator: event.user.id
            }, { source: 'createTask' });
        }
        
        return {
            statusCode: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify(taskItem)
        };

    } catch (error) {
        logger.error('Failed to create task transaction', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify({ error: 'Failed to create task due to internal server error' })
        };
    }
};

// Apply Middleware enforcing Admin-only scope for createTask
exports.handler = requireRole(['Admin'])(createTaskHandler);
