const { requireRole } = require('./shared/middleware/auth');
const logger = require('./shared/utils/logger');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const { CognitoIdentityProviderClient, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);
const cognitoClient = new CognitoIdentityProviderClient({});
const snsClient = new SNSClient({});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

async function publishTaskNotification(payload, context) {
    if (!SNS_TOPIC_ARN) {
        console.warn('SNS_TOPIC_ARN not configured, skipping notification');
        return;
    }

    try {
        const command = new PublishCommand({
            TopicArn: SNS_TOPIC_ARN,
            Message: JSON.stringify(payload),
            MessageAttributes: {
                'notification_type': {
                    DataType: 'String',
                    StringValue: 'TASK_ASSIGNED'
                }
            }
        });
        await snsClient.send(command);
        console.log('Successfully published task notification');
    } catch (error) {
        console.error('Error publishing task notification:', error);
    }
}

const assignTaskHandler = async (event) => {
    logger.info('AssignTask invoked', { userId: event.user.id });

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
        const { assigneeIds } = body;
        const taskId = event.pathParameters?.id;

        if (!taskId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                    'Access-Control-Allow-Credentials': true
                },
                body: JSON.stringify({ error: 'Task ID is required in the path pathParameters.' })
            };
        }

        if (!Array.isArray(assigneeIds) || assigneeIds.length === 0) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                    'Access-Control-Allow-Credentials': true
                },
                body: JSON.stringify({ error: 'Invalid or missing assigneeIds. Must be a non-empty array.' })
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
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                    'Access-Control-Allow-Credentials': true
                },
                body: JSON.stringify({ error: 'Task not found' })
            };
        }

        const currentTask = getResponse.Item;

        // Prevent duplicate assignments
        const newAssignees = assigneeIds.filter(id => !currentTask.assigneeIds?.includes(id));
        if (newAssignees.length === 0) {
            return {
                statusCode: 409,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true
                },
                body: JSON.stringify({ error: 'All provided users are already assigned to this task.' })
            };
        }


        // --- Constraint: Ensure User is active / valid ---
        // "Deleted or deactivated users cannot receive new task assignments"
        // Validate all new assignees are active users
        for (const id of newAssignees) {
            try {
                const userResponse = await cognitoClient.send(new AdminGetUserCommand({
                    UserPoolId: USER_POOL_ID,
                    Username: id
                }));
                if (!userResponse.Enabled) {
                    logger.warn(`Attempt to assign task to deactivated user: ${id}`);
                    return {
                        statusCode: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                            'Access-Control-Allow-Credentials': true
                        },
                        body: JSON.stringify({ error: `Cannot assign tasks to disabled or deactivated user: ${id}` })
                    };
                }
            } catch (cognitoError) {
                if (cognitoError.name === 'UserNotFoundException') {
                    return {
                        statusCode: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                            'Access-Control-Allow-Credentials': true
                        },
                        body: JSON.stringify({ error: `Assignee does not exist: ${id}` })
                    };
                }
                logger.error('Failed to verify user status with Cognito', cognitoError);
                return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Access-Control-Allow-Credentials': true }, body: JSON.stringify({ error: 'Failed validating assignee.' }) };
            }
        }

        const updatedAt = new Date().toISOString();

        // Update task with new assignees (append to array, update GSI1PKs)
        const updatedAssigneeIds = Array.from(new Set([...(currentTask.assigneeIds || []), ...newAssignees]));
        const updateParams = {
            TableName: TABLE_NAME,
            Key: {
                PK: `TENANT#${tenantId}`,
                SK: `TASK#${taskId}`
            },
            UpdateExpression: 'SET assigneeIds = :a, GSI1PKs = :gpk, updatedAt = :u',
            ConditionExpression: 'attribute_exists(PK)',
            ExpressionAttributeValues: {
                ':a': updatedAssigneeIds,
                ':gpk': updatedAssigneeIds.map(id => `ASSIGNEE#${id}`),
                ':u': updatedAt
            },
            ReturnValues: 'ALL_NEW'
        };

        const result = await ddbDocClient.send(new UpdateCommand(updateParams));

        await publishTaskNotification({
            type: 'TASK_ASSIGNED',
            taskId,
            title: currentTask.title,
            assignedUsers: newAssignees,
            initiator: event.user.id
        }, { source: 'assignTask' });

        logger.info('Task assigned successfully', { taskId, assigneeIds: updatedAssigneeIds, adminId: event.user.id });
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                'Access-Control-Allow-Credentials': true
            },
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
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};

// Constraint 2 & PDF: Only Admins can assign tasks. 
// "Admins can create and assign tasks"
// "Members cannot create or assign tasks"
exports.handler = requireRole(['Admin'])(assignTaskHandler);