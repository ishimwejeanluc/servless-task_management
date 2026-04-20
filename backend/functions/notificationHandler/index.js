const logger = require('../../shared/utils/logger');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

const sesClient = new SESClient({});
const SYSTEM_EMAIL = process.env.SYSTEM_EMAIL || 'no-reply@amalitech.com';

/**
 * Event-Driven Notification Handler
 * 
 * Invoked by DynamoDB Streams. Processes batched changes to the Tasks table
 * and dispatches emails via Amazon SES when a task is newly assigned or updated.
 */
exports.handler = async (event) => {
    logger.info('NotificationHandler invoked', { recordCount: event.Records.length });
    
    // We process records in batch, but collect individual failures to utilize 
    // Lambda ReportBatchItemFailures so we don't retry successful items.
    const failedMessageIds = [];

    for (const record of event.Records) {
        try {
            // Only care about INSERT (new tasks) and MODIFY (updated tasks)
            if (record.eventName !== 'INSERT' && record.eventName !== 'MODIFY') {
                continue;
            }

            // Unmarshall DynamoDB format ({ S: "value" }) to standard JSON
            const newImage = unmarshall(record.dynamodb.NewImage || {});
            const oldImage = record.dynamodb.OldImage ? unmarshall(record.dynamodb.OldImage) : {};

            // We only send emails if it's a TASK entity
            if (!newImage.SK || !newImage.SK.startsWith('TASK#')) {
                continue;
            }

            const { id, title, assigneeId, status, createdBy } = newImage;
            
            // Business Logic: Determine what changed to format the correct email
            let notificationRequired = false;
            let subject = '';
            let bodyText = '';
            let recipients = [];

            // Scenario 1: New task assigned OR Re-assigned to someone else
            // PDF Constraint: "To members when tasks are assigned"
            if (assigneeId !== 'UNASSIGNED' && assigneeId !== oldImage.assigneeId) {
                notificationRequired = true;
                subject = `Task Assigned: ${title}`;
                bodyText = `You have been assigned a new task: "${title}". Task ID: ${id}`;
                recipients.push(`${assigneeId}@amalitech.com`); // Sending to assignee
            }
            // Scenario 2: Task Status Updated
            // PDF Constraint: "To admins and all assigned members when task status changes"
            else if (oldImage.status && status !== oldImage.status) {
                notificationRequired = true;
                subject = `Task Status Updated: ${title}`;
                bodyText = `The task "${title}" is now marked as [${status}].`;
                
                if (assigneeId !== 'UNASSIGNED') {
                    recipients.push(`${assigneeId}@amalitech.com`); // Member assignee
                }
                if (createdBy) {
                    recipients.push(`${createdBy}@amalitech.com`);  // Admin creator
                }
            }

            if (notificationRequired && recipients.length > 0) {
                // Deduplicate emails naturally
                const uniqueRecipients = [...new Set(recipients)];
                
                await dispatchEmail(uniqueRecipients, subject, bodyText);
                logger.info(`Notification sent`, { taskId: id, recipients: uniqueRecipients });
            }

        } catch (error) {
            logger.error(`Failed to process DynamoDB stream record`, error, { messageId: record.messageId });
            // Track the failure so Lambda will explicitly retry just this message, 
            // protecting us from the "poison pill" poison message loops.
            failedMessageIds.push(record.messageId);
        }
    }

    // Return the failed message IDs. If this array is populated, AWS Lambda
    // will leave those specific records on the Stream to be retried automatically.
    // If it fails until the stream expiry (e.g. 24 hours) or max retry limit, 
    // it will be routed to the configured SQS Dead-Letter Queue (DLQ).
    return {
        batchItemFailures: failedMessageIds.map(id => ({ itemIdentifier: id }))
    };
};

/**
 * Helper to dispatch via SES
 */
async function dispatchEmail(toAddresses, subject, text) {
    const params = {
        Source: SYSTEM_EMAIL,
        Destination: { ToAddresses: toAddresses },
        Message: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: { Text: { Data: text, Charset: 'UTF-8' } }
        }
    };
    await sesClient.send(new SendEmailCommand(params));
}
