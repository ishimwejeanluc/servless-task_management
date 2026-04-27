const { requireRole } = require('./shared/middleware/auth');
const logger = require('./shared/utils/logger');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const AWS = require('aws-sdk');

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

const updateTaskHandler = async (event) => {
    logger.info('UpdateTask invoked', { userId: event.user.id });

    try {
        if (!event.body) {
            return { statusCode: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Access-Control-Allow-Credentials': true }, body: JSON.stringify({ error: 'Missing request body' }) };
        }

        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        const taskId = event.pathParameters?.id;
        const tenantId = event.user.tenantId;

        if (!taskId) {
            return { statusCode: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Access-Control-Allow-Credentials': true }, body: JSON.stringify({ error: 'Task ID required' }) };
        }

        // What fields can a member modify vs an admin?
        // Members typically only update Status.
        // Admins might update title, desc, status. (Assignment is handled in assignTask).

        const allowedRolesForUpdate = event.user.groups;
        const isAdmin = allowedRolesForUpdate.includes('Admin');

        // Fetch task first to check ownership if they are a Member
        const getTaskResponse = await ddbDocClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `TENANT#${tenantId}`, SK: `TASK#${taskId}` }
        }));

        const task = getTaskResponse.Item;
        if (!task) {
            return { statusCode: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Access-Control-Allow-Credentials': true }, body: JSON.stringify({ error: 'Task not found' }) };
        }

        // --- Constraint: Member can only update THEIR assigned tasks (multiple assignees) ---
        const identityCandidates = [event.user.id, event.user.username, event.user.email].filter(Boolean);
        if (!isAdmin && (!Array.isArray(task.assigneeIds) || !task.assigneeIds.some(assignee => identityCandidates.includes(assignee)))) {
            logger.warn(`Unauthorized update attempt: Member ${event.user.id} tried to update task not assigned to them.`);
            return {
                statusCode: 403,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                    'Access-Control-Allow-Credentials': true
                },
                body: JSON.stringify({ error: 'Forbidden: Members can only update tasks assigned to them.' })
            };
        }


        // Build update expression dynamically based on provided fields and Role.
        const updateDoc = {};
        if (body.status) updateDoc.status = body.status;

        // Admins can update title and description
        if (isAdmin) {
            if (body.title) updateDoc.title = body.title;
            if (body.description) updateDoc.description = body.description;
        }

        if (Object.keys(updateDoc).length === 0) {
            return { statusCode: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Access-Control-Allow-Credentials': true }, body: JSON.stringify({ error: 'No valid fields provided for update' }) };
        }

        let updateExpression = 'SET updatedAt = :updatedAt';
        let expressionAttributeValues = {
            ':updatedAt': new Date().toISOString()
        };

        let i = 1;
        for (const [key, value] of Object.entries(updateDoc)) {
            updateExpression += `, #${key}_field = :val${i}`;
            expressionAttributeValues[`:val${i}`] = value;
            // Use names to avoid reserved word conflicts in DynamoDB
            expressionAttributeValues[`#${key}_field`] = value; // Wait, ExpressionAttributeNames is needed for # fields
            i++;
        }

        // More robust dynamically building UpdateExpression with Names/Values
        let exprNames = {};
        let exprValues = { ':updatedAt': new Date().toISOString() };
        let setParts = ['updatedAt = :updatedAt'];

        for (const [key, value] of Object.entries(updateDoc)) {
            exprNames[`#${key}`] = key;
            exprValues[`:${key}`] = value;
            setParts.push(`#${key} = :${key}`);
        }

        // Example: If updating status, we must also update the GSI1SK which tracks status for assignee queries
        if (body.status) {
            setParts.push('GSI1SK = :newGsi1Sk');
            exprValues[':newGsi1Sk'] = `STATUS#${body.status}`;
        }

        const updateParams = {
            TableName: TABLE_NAME,
            Key: { PK: `TENANT#${tenantId}`, SK: `TASK#${taskId}` },
            UpdateExpression: `SET ${setParts.join(', ')}`,
            ExpressionAttributeNames: exprNames,
            ExpressionAttributeValues: exprValues,
            ConditionExpression: 'attribute_exists(PK)',
            ReturnValues: 'ALL_NEW'
        };


        const result = await ddbDocClient.send(new UpdateCommand(updateParams));

        if (body.status && body.status !== task.status) {
            await publishTaskNotification({
                type: 'TASK_STATUS_UPDATED',
                taskId,
                title: result.Attributes?.title || task.title,
                status: body.status,
                assignedUsers: result.Attributes?.assigneeIds || task.assigneeIds || [],
                initiator: event.user.id
            }, { source: 'updateTask' });
        }

        return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Access-Control-Allow-Credentials': true }, body: JSON.stringify(result.Attributes) };

    } catch (error) {
        logger.error('Failed to update task', error);
        return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Access-Control-Allow-Credentials': true }, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};


// Admins and Members can update, but logic inside differentiates permissions
exports.handler = requireRole(['Admin', 'Member'])(updateTaskHandler);