const { requireRole } = require('../../shared/middleware/auth');
const logger = require('../../shared/utils/logger');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const { CognitoIdentityProviderClient, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);
const cognitoClient = new CognitoIdentityProviderClient({});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

const assignTaskHandler = async (event) => {
    logger.info('AssignTask invoked', { userId: event.user.id });

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing request body' })
            };
        }

        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        const { assigneeId } = body;
        const taskId = event.pathParameters?.id;

        if (!taskId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Task ID is required in the path pathParameters.' })
            };
        }

        if (!assigneeId || typeof assigneeId !== 'string' || assigneeId.trim().length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid or missing assigneeId. Must be a non-empty string.' })
            };
        }

        const tenantId = event.user.tenantId;

        // --- Constraint 1: Prevent Duplicate Assignments / Verify Task Exists ---
        // First, let's get the current task to check if it's already assigned
        const getResponse = await ddbDocClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `TENANT#${tenantId}`,
                SK: `TASK#${taskId}`
            }
        }));

        if (!getResponse.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Task not found' })
            };
        }

        const currentTask = getResponse.Item;

        if (currentTask.assigneeId === assigneeId) {
             return {
                statusCode: 409, // Conflict - or could be 400 based on API design preference.
                body: JSON.stringify({ error: 'Duplicate assignment: This user is already assigned to this task.' })
             }
        }


        // --- Constraint: Ensure User is active / valid ---
        // "Deleted or deactivated users cannot receive new task assignments"
        try {
            const userResponse = await cognitoClient.send(new AdminGetUserCommand({
                UserPoolId: USER_POOL_ID,
                Username: assigneeId
            }));

            // Check if user is fully active
            if (!userResponse || userResponse.UserStatus === 'FORCE_CHANGE_PASSWORD' || Object.keys(userResponse).length === 0) {
                // For demonstration, an unconfirmed user shouldn't be assigned
            }

            if (!userResponse.Enabled) {
                logger.warn(`Attempt to assign task to deactivated user: ${assigneeId}`);
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Cannot assign tasks to disabled or deactivated users.' })
                };
            }
        } catch (cognitoError) {
             if (cognitoError.name === 'UserNotFoundException') {
                 return {
                     statusCode: 400,
                     body: JSON.stringify({ error: 'Assignee does not exist.' })
                 };
             }
             logger.error('Failed to verify user status with Cognito', cognitoError);
             return { statusCode: 500, body: JSON.stringify({ error: 'Failed validating assignee.' }) };
        }

        const updatedAt = new Date().toISOString();

        const updateParams = {
            TableName: TABLE_NAME,
            Key: {
                PK: `TENANT#${tenantId}`,
                SK: `TASK#${taskId}`
            },
            UpdateExpression: 'SET assigneeId = :a, GSI1PK = :gpk, updatedAt = :u',
            // ConditionExpression ensures we only update if the task still exists 
            // and maybe hasn't been closed by someone else in the meantime (optimistic locking could go here)
            ConditionExpression: 'attribute_exists(PK)', 
            ExpressionAttributeValues: {
                ':a': assigneeId,
                ':gpk': `ASSIGNEE#${assigneeId}`, 
                ':u': updatedAt
            },
            ReturnValues: 'ALL_NEW'
        };

        const result = await ddbDocClient.send(new UpdateCommand(updateParams));

        logger.info('Task assigned successfully', { taskId, assigneeId, adminId: event.user.id });
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result.Attributes)
        };

    } catch (error) {
        logger.error('Failed to assign task', error);
        
        if (error.name === 'ConditionalCheckFailedException') {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Task not found or already modified' })
            }
        }

        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to assign task due to internal server error' })
        };
    }
};

// Constraint 2 & PDF: Only Admins can assign tasks. 
// "Admins can create and assign tasks"
// "Members cannot create or assign tasks"
exports.handler = requireRole(['Admin'])(assignTaskHandler);