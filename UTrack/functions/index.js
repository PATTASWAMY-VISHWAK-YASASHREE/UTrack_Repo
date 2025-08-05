const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");
require("dotenv").config();

admin.initializeApp();

const db = admin.firestore();

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

sgMail.setApiKey(SENDGRID_API_KEY);

// Razorpay webhook handler for payment events
exports.razorpayWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // Verify the webhook signature for security
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return res.status(400).send('Invalid signature');
      }
    }

    const event = req.body.event;
    const paymentData = req.body.payload.payment.entity;

    console.log('Razorpay webhook event:', event);
    console.log('Payment data:', paymentData);

    // Handle successful payment events
    if (event === 'payment.captured' || event === 'payment.authorized') {
      await handleSuccessfulPayment(paymentData);
    } else if (event === 'payment.failed') {
      await handleFailedPayment(paymentData);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Handle successful payment processing
async function handleSuccessfulPayment(paymentData) {
  try {
    const {
      id: paymentId,
      amount,
      currency,
      status,
      method,
      created_at,
      description,
      notes = {}
    } = paymentData;

    // Extract user info from payment notes or description
    const userId = notes.userId || extractUserIdFromDescription(description);
    
    if (!userId) {
      console.error('No user ID found in payment data');
      return;
    }

    // Create transaction record
    const transactionData = {
      paymentId,
      amount: amount / 100, // Convert paise to rupees
      currency,
      status,
      method,
      createdAt: new Date(created_at * 1000),
      description: description || 'UTrack Payment',
      type: 'razorpay_payment',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      processedAt: new Date(),
      
      // Additional metadata
      metadata: {
        source: 'razorpay_webhook',
        paymentGateway: 'razorpay',
        originalData: paymentData
      }
    };

    // Save transaction to user's record
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.error('User not found:', userId);
      return;
    }

    const userData = userDoc.data();
    
    // Add transaction to user_transactions array
    const currentTransactions = userData.user_transactions || [];
    currentTransactions.push(transactionData);

    // Update spending calculations
    const currentSpendings = calculateUpdatedSpendings(userData, transactionData.amount);

    // Update user document
    await userRef.update({
      user_transactions: currentTransactions,
      userspendings: currentSpendings,
      lastTransactionAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Successfully processed Razorpay payment:', paymentId);

    // Check for budget alerts
    await checkAndSendBudgetAlerts(userId, userData.email, currentSpendings);

  } catch (error) {
    console.error('Error processing successful payment:', error);
  }
}

// Handle failed payment
async function handleFailedPayment(paymentData) {
  try {
    const { id: paymentId, notes = {} } = paymentData;
    const userId = notes.userId || extractUserIdFromDescription(paymentData.description);

    if (userId) {
      // Log failed transaction for reference
      const failedTransactionData = {
        paymentId,
        status: 'failed',
        amount: paymentData.amount / 100,
        currency: paymentData.currency,
        method: paymentData.method,
        createdAt: new Date(paymentData.created_at * 1000),
        type: 'razorpay_payment_failed',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };

      const userRef = db.collection('users').doc(userId);
      const userData = (await userRef.get()).data();
      const currentFailedTransactions = userData.failed_transactions || [];
      currentFailedTransactions.push(failedTransactionData);

      await userRef.update({
        failed_transactions: currentFailedTransactions
      });

      console.log('Logged failed payment:', paymentId);
    }
  } catch (error) {
    console.error('Error processing failed payment:', error);
  }
}

// Calculate updated spending amounts
function calculateUpdatedSpendings(userData, newAmount) {
  const currentSpendings = userData.userspendings || {};
  const budget = userData.usersettings?.montly_budget || 0;

  return {
    today: {
      spent: (currentSpendings.today?.spent || 0) + newAmount,
      budget: Math.round(budget / 30)
    },
    this_week: {
      spent: (currentSpendings.this_week?.spent || 0) + newAmount,
      budget: Math.round(budget / 4)
    },
    this_month: {
      spent: (currentSpendings.this_month?.spent || 0) + newAmount,
      budget: budget
    },
    overall: {
      spent: (currentSpendings.overall?.spent || 0) + newAmount,
      budget: budget
    }
  };
}

// Check and send budget alerts
async function checkAndSendBudgetAlerts(userId, userEmail, spendings) {
  if (!userEmail) return;

  const alerts = [];
  
  Object.entries(spendings).forEach(([period, data]) => {
    if (data.spent > data.budget) {
      const overAmount = data.spent - data.budget;
      const percentage = ((data.spent / data.budget) * 100).toFixed(1);
      
      alerts.push({
        period: period.replace('_', ' '),
        spent: data.spent,
        budget: data.budget,
        overAmount,
        percentage
      });
    }
  });

  if (alerts.length > 0) {
    console.log('Budget exceeded - sending alert to:', userEmail);
    // This will trigger the sendSpendingAlert function automatically
  }
}

// Extract user ID from payment description or notes
function extractUserIdFromDescription(description) {
  if (!description) return null;
  
  // Look for user ID patterns in description
  const userIdMatch = description.match(/userId[:\s]+([a-zA-Z0-9]+)/i);
  if (userIdMatch) {
    return userIdMatch[1];
  }
  
  // Look for UID patterns
  const uidMatch = description.match(/uid[:\s]+([a-zA-Z0-9]+)/i);
  if (uidMatch) {
    return uidMatch[1];
  }
  
  return null;
}

exports.sendSpendingAlert = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, _context) => {
    const _before = change.before.data();
    const after = change.after.data();

    const spendings = after.userspendings; // Fixed typo: was user_spendings
    const email = after.email;
    const name = after.name;

    // Check all spending periods for alerts
    const alerts = [];
    if (spendings) {
      Object.entries(spendings).forEach(([period, data]) => {
        if (data && data.spent > data.budget) {
          const overAmount = data.spent - data.budget;
          const percentage = ((data.spent / data.budget) * 100).toFixed(1);
          
          alerts.push({
            period: period.replace('_', ' '),
            spent: data.spent,
            budget: data.budget,
            overAmount,
            percentage
          });
        }
      });
    }

    // Send alert if any budget is exceeded
    if (alerts.length > 0) {
      const alertMessage = alerts.map(alert => 
        `${alert.period.toUpperCase()}: Spent ₹${alert.spent.toFixed(2)}, Budget ₹${alert.budget.toFixed(2)} (${alert.percentage}% over budget)`
      ).join('\n');

      const msg = {
        to: email,
        from: ADMIN_EMAIL,
        subject: `🚨 Budget Alert - Spending Limit Exceeded`,
        text: `Hi ${name},\n\nYou have exceeded your spending limits:\n\n${alertMessage}\n\nConsider reviewing your expenses to stay on track!\n\nBest regards,\nUTrack Budget Tracker`,
      };

      try {
        await sgMail.send(msg);
        console.log("Budget alert email sent to", email);
      } catch (err) {
        console.error("Error sending budget alert email:", err);
      }
    }
  });