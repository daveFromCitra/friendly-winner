const axios = require('axios');
require('dotenv').config() 

async function sendWebhook(webhookBody) {
    const webhookUrl = process.env.WEBHOOK_URL;
    // Send the POST request with the webhook body
    try {
      const response = await axios.post(webhookUrl, webhookBody);
      console.log('Webhook sent successfully:', response.data);
    } catch (error) {
    //   console.error('Failed to send webhook:', error);
      console.error('Failed to send webhook');
    }
}

module.exports = {
    sendWebhook
}

