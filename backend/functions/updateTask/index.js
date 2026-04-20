const { requireRole } = require('../../shared/middleware/auth');
const logger = require('../../shared/utils/logger');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

const updateTaskHandler = async (event) => {
    logger.info('UpdateTask invoked', { userId: event.user.id });

    try {
        if (!event.body) {
             return { statusCode: 400, body: JSON.stringify({ error: 'Missing request body' }) };
        }

        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        const taskId = event.pathParameters?.id;
        const tenantId = event.user.tenantId;

        if (!taskId) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Task ID required' }) };
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
             return { statusCode: 404, body: JSON.stringify({ error: 'Task not found' }) };
        }

        // --- Constraint: Member can only update THEIR assigned tasks ---
        if (!isAdmin && task.assigneeId !== event.user.id) {
             logger.warn(`Unauthorized update attempt: Member ${event.user.id} tried to update task assigned to ${task.assigneeId}`);
             return { 
                statusCode: 403, 
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
             return { statusCode: 400, body: JSON.stringify({ error: 'No valid fields provided for update' }) };
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

        return { statusCode: 200, body: JSON.stringify(result.Attributes) };

    } catch (error) {
        logger.error('Failed to update task', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};

// Admins and Members can update, but logic inside differentiates permissions
exports.handler = requireRole(['Admin', 'Member'])(updateTaskHandler);