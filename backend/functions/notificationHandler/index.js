const logger = require('./shared/utils/logger');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({});
const SYSTEM_EMAIL = process.env.SYSTEM_EMAIL || 'no-reply@amalitech.com';
const ADMIN_NOTIFICATION_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL || 'jeanluc.ishimwe@amalitech.com';

/**
 * Event-Driven Notification Handler
 * 
 * Invoked by SNS. Processes task notification events and dispatches emails via Amazon SES.
 */
exports.handler = async (event) => {
    const records = Array.isArray(event?.Records) ? event.Records : [];
    logger.info('NotificationHandler received SNS event', { recordCount: records.length });

    const results = [];

    for (const record of records) {
        const snsMessageId = record?.Sns?.MessageId;
        const topicArn = record?.Sns?.TopicArn;
        const rawMessage = record?.Sns?.Message;

        try {
            logger.info('Processing SNS record', { snsMessageId, topicArn });

            if (!rawMessage) {
                logger.warn('SNS record missing message body', { snsMessageId, topicArn });
                results.push({ messageId: snsMessageId, status: 'skipped' });
                continue;
            }

            const message = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage;
            logger.info('Parsed SNS message', { snsMessageId, topicArn, message });

            const assignedUsers = Array.isArray(message.assignedUsers) ? message.assignedUsers.filter(Boolean) : [];
            let recipients = [];
            let subject = '';
            let bodyText = '';

            if (message.type === 'TASK_ASSIGNED') {
                recipients = assignedUsers;
                subject = `Task Assigned: ${message.title || message.taskId}`;
                bodyText = `You have been assigned a task: "${message.title || message.taskId}". Task ID: ${message.taskId}`;
            } else if (message.type === 'TASK_STATUS_UPDATED') {
                recipients = [...assignedUsers, ADMIN_NOTIFICATION_EMAIL];
                subject = `Task Status Updated: ${message.title || message.taskId}`;
                bodyText = `The task "${message.title || message.taskId}" is now marked as ${message.status || 'UPDATED'}. Task ID: ${message.taskId}`;
            } else {
                logger.warn('Unsupported SNS notification type', { snsMessageId, topicArn, type: message.type });
                results.push({ messageId: snsMessageId, status: 'skipped' });
                continue;
            }

            recipients = [...new Set(recipients.filter(Boolean))];

            if (recipients.length === 0) {
                logger.warn('No notification recipients resolved', { snsMessageId, topicArn, taskId: message.taskId, type: message.type });
                results.push({ messageId: snsMessageId, status: 'skipped' });
                continue;
            }

            await dispatchEmail(recipients, subject, bodyText);
            logger.info('Email notification sent', { snsMessageId, topicArn, taskId: message.taskId, recipients, type: message.type });
            results.push({ messageId: snsMessageId, status: 'sent' });

        } catch (error) {
            logger.error('Failed to process SNS notification record', error, { snsMessageId, topicArn });
            results.push({ messageId: snsMessageId, status: 'failed' });
        }
    }

    return {
        processed: results.length,
        results
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
