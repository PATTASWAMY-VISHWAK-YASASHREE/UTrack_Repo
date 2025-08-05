import React from 'react';
import BottomNav from '../components/BottomNav';
import './PageStyles.css';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase'; 
import SkeletonLayout from "../components/SkeletonLayout"
import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';

// ===== IMPROVED BUDGET ALERT SYSTEM =====
const checkBudgetAlerts = async (userSpendings, userEmail) => {
  if (!userEmail || !userSpendings) return;

  const alerts = [];
  
  // Check each spending category
  Object.entries(userSpendings).forEach(([period, data]) => {
    if (data && data.spent > data.budget && data.budget > 0) {
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

  // Send simplified alert if there are budget overruns
  if (alerts.length > 0) {
    await sendSimpleBudgetAlert(userEmail, alerts);
  }
};

// Simplified budget alert without external dependencies
const sendSimpleBudgetAlert = async (email, alerts) => {
  try {
    console.log('📧 Budget Alert Summary for:', email);
    console.log('⚠️ Budget Overruns:', alerts);
    
    // Log alert details for debugging
    alerts.forEach(alert => {
      console.log(`🚨 ${alert.period.toUpperCase()}: Spent ₹${alert.spent.toFixed(2)} / Budget ₹${alert.budget.toFixed(2)} (${alert.percentage}% over)`);
    });
    
    // You can integrate with your preferred notification service here
    // For now, we'll use console logging and browser notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      // Request permission for notifications
      if (Notification.permission === 'granted') {
        new Notification('UTrack Budget Alert', {
          body: `You've exceeded ${alerts.length} budget limit(s). Check your spending!`,
          icon: '/favicon.ico'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('UTrack Budget Alert', {
              body: `You've exceeded ${alerts.length} budget limit(s). Check your spending!`,
              icon: '/favicon.ico'
            });
          }
        });
      }
    }
    
    console.log('✅ Budget alert processed successfully');
  } catch (error) {
    console.error('❌ Failed to send budget alert:', error);
  }
};

// Simplified rate limiting - use sessionStorage instead of memory
const shouldSendAlert = (email, alerts) => {
  try {
    const now = Date.now();
    const alertKey = `budget_alert_${email}_${alerts.map(a => a.period).join('_')}`;
    const lastSent = parseInt(sessionStorage.getItem(alertKey) || '0');
    const cooldown = 2 * 60 * 60 * 1000; // 2 hours cooldown
    
    if (now - lastSent > cooldown) {
      sessionStorage.setItem(alertKey, now.toString());
      return true;
    }
    
    console.log(`⏳ Alert cooldown active for ${email}. Next alert available in ${Math.round((cooldown - (now - lastSent)) / (60 * 1000))} minutes.`);
    return false;
  } catch (error) {
    console.error('Error checking alert cooldown:', error);
    return true; // Default to allowing alerts if there's an error
  }
};
// ===== END IMPROVED BUDGET ALERT SYSTEM =====

const CircularProgress = ({ percentage, color }) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-12 h-12">
      <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          className="text-gray-700"
        />
        <circle
          cx="20"
          cy="20"
          r={radius}
          stroke={color}
          strokeWidth="4"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300"
        />
      </svg>
    </div>
  );
};

const SpendingCard = ({ title, spent, budget, color, percentage }) => (
  <div className="bg-gray-800 p-4 rounded-lg flex-1 min-w-[140px]">
    <h3 className="text-white text-sm mb-3">{title}</h3>
    <div className="flex items-center justify-between">
      <div className="mr-1">
        <div className="text-white text-sm font-semibold">{spent}</div>
        <hr className="border-white opacity-100 my-0" />
        <div className="text-gray-400 text-sm">{budget}</div>
      </div>
      <CircularProgress percentage={percentage} color={color} />
    </div>
  </div>
);

const ReceiptItem = ({ amount, type, onViewClick }) => (
  <div className="bg-gray-700 p-4 rounded-lg flex flex-col items-center justify-between min-w-[80px] max-w-[100px]">
    <div className="text-xs text-gray-200 mb-1 whitespace-nowrap">You spend</div>
    <div className={`text-sm font-semibold mb-2 ${type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
      {amount.total_amount}
    </div>
    <button
      onClick={onViewClick}
      className="bg-blue-500 text-white text-xs px-3 py-1 rounded hover:bg-blue-600 transition"
    >
      View
    </button>
  </div>
);

const ChatItem = ({ is_chat, title, description }) => {
  if (is_chat) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg mb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-white font-medium mb-1">{title}</h4>
            <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
          </div>
          <div className="ml-3 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </div>
      </div>
    );
  } else {
    return (
      <div className="bg-gray-800 text-white p-4 rounded-lg text-center shadow-md max-w-xs mx-auto">
        <p className="text-lg font-semibold mb-2">No Chat Logs</p>
        <p className="text-sm text-gray-400">
          Use our <span className="text-blue-400 font-medium">advanced AI-budget-planner</span> tool to get started!
        </p>
      </div>
    );
  }
}

const Home = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalHtml, setModalHtml] = useState(null);
  const [chats, setChats] = useState(false);
  const [dbchats, setDbChats] = useState([]);
  const [useruid, setUserUid] = useState(null);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          setUserUid(user.uid)
          const userRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userRef);
          
          if (docSnap.exists()) {
            setUserData(docSnap.data());
            
            if (docSnap.data().user_chats.length > 0) {
              setChats(docSnap.data().user_chats.length > 0);
              setDbChats(docSnap.data().user_chats);
            }
            setLoading(false);
            console.log("retrieved successfully");
          } else {
            console.log("No user data found in Firestore");
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
        }
      } else {
        console.log("No user logged in");
      }
    });

    return () => unsubscribe();
  }, []);

  const openModal = (htmlContent) => {
    setModalHtml(htmlContent);
  };

  const closeModal = () => {
    setModalHtml(null);
  };

  const budget = userData?.usersettings?.montly_budget

  const recieptsData = userData?.user_bills != null;
  const userBill = userData?.user_bills;
  let value = 0;
  console.log(userBill)
  if (recieptsData) {
    value = calculateTotalSpending(userData?.user_bills)
  }

  function parseFlexibleDate(dateStr) {
    if (!dateStr) return null;

    // Handle various timestamp formats
    if (typeof dateStr === 'object' && dateStr instanceof Date) {
      return dateStr;
    }

    if (typeof dateStr === 'number') {
      return new Date(dateStr);
    }

    if (typeof dateStr !== 'string') return null;

    // Try ISO format first (most reliable)
    let parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed;

    // Clean the string
    dateStr = dateStr.trim();

    // Try common Indian formats: DD/MM/YYYY HH:mm
    const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (ddmmyyyyMatch) {
      const [, dd, mm, yyyy, hh = "00", min = "00", sec = "00"] = ddmmyyyyMatch;
      // Note: months are 0-indexed in JavaScript Date
      return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd), parseInt(hh), parseInt(min), parseInt(sec));
    }

    // Try DD-MM-YYYY HH:mm:ss AM/PM format
    const dashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i);
    if (dashMatch) {
      let [, dd, mm, yyyy, hh, min, sec, ampm] = dashMatch;
      hh = parseInt(hh);
      if (ampm.toUpperCase() === "PM" && hh !== 12) hh += 12;
      if (ampm.toUpperCase() === "AM" && hh === 12) hh = 0;
      return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd), hh, parseInt(min), parseInt(sec));
    }

    // Try MM/DD/YYYY format
    const mmddyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (mmddyyyyMatch) {
      const [, mm, dd, yyyy, hh = "00", min = "00", sec = "00"] = mmddyyyyMatch;
      // Try both interpretations - prefer DD/MM for Indian context
      const date1 = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd), parseInt(hh), parseInt(min), parseInt(sec));
      const date2 = new Date(parseInt(yyyy), parseInt(dd) - 1, parseInt(mm), parseInt(hh), parseInt(min), parseInt(sec));
      
      // Return the more recent/reasonable date (basic heuristic)
      const now = new Date();
      const diff1 = Math.abs(now.getTime() - date1.getTime());
      const diff2 = Math.abs(now.getTime() - date2.getTime());
      return diff1 < diff2 ? date1 : date2;
    }

    // Last resort: try native Date parsing
    const fallback = new Date(dateStr);
    return !isNaN(fallback.getTime()) ? fallback : null;
  }

  function calculateSpendingByTime(userbill) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let total = 0, today = 0, week = 0, month = 0;

    for (const bill of userbill) {
      const amountRaw = bill?.json?.total_amount;
      const dateStr = bill?.json?.time_stamp;

      if (!amountRaw || !dateStr) continue;

      const amount = typeof amountRaw === "string"
        ? parseFloat(amountRaw.match(/\d+(\.\d+)?/)?.[0] || 0)
        : amountRaw;

      if (isNaN(amount)) continue;

      const billDate = parseFlexibleDate(dateStr);
      if (!billDate || isNaN(billDate)) continue;

      total += amount;

      if (billDate.toISOString().slice(0, 10) === todayStr) {
        today += amount;
      }

      if (billDate >= startOfWeek && billDate <= now) {
        week += amount;
      }

      if (billDate >= startOfMonth && billDate <= now) {
        month += amount;
      }
    }

    return { total, today, week, month };
  }

  const { total, today, week, month } = calculateSpendingByTime(userBill || []);
  
  // Add Razorpay transactions to spending calculations
  const razorpayTransactions = userData?.user_transactions || [];
  const razorpaySpending = calculateRazorpaySpending(razorpayTransactions);
  
  // Combined spending totals
  const combinedSpending = {
    total: total + razorpaySpending.total,
    today: today + razorpaySpending.today,
    week: week + razorpaySpending.week,
    month: month + razorpaySpending.month
  };
  
  console.log('Bills spending:', { total, today, week, month });
  console.log('Razorpay spending:', razorpaySpending);
  console.log('Combined spending:', combinedSpending);

  function calculateRazorpaySpending(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return { total: 0, today: 0, week: 0, month: 0 };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let total = 0, today = 0, week = 0, month = 0;

    transactions.forEach(transaction => {
      // Handle various amount formats
      let amount = 0;
      if (typeof transaction.amount === 'number') {
        amount = transaction.amount;
      } else if (typeof transaction.amount === 'string') {
        const parsed = parseFloat(transaction.amount.match(/\d+(\.\d+)?/)?.[0] || 0);
        amount = parsed;
      }

      if (isNaN(amount) || amount <= 0) return;

      // Handle various date formats
      let transactionDate = null;
      if (transaction.createdAt) {
        if (transaction.createdAt instanceof Date) {
          transactionDate = transaction.createdAt;
        } else if (typeof transaction.createdAt === 'string' || typeof transaction.createdAt === 'number') {
          transactionDate = new Date(transaction.createdAt);
        }
      } else if (transaction.timestamp) {
        transactionDate = new Date(transaction.timestamp);
      }

      if (!transactionDate || isNaN(transactionDate.getTime())) return;

      total += amount;

      // Today
      if (transactionDate >= todayStart && transactionDate <= now) {
        today += amount;
      }

      // This week
      if (transactionDate >= weekStart && transactionDate <= now) {
        week += amount;
      }

      // This month
      if (transactionDate >= monthStart && transactionDate <= now) {
        month += amount;
      }
    });

    return { total, today, week, month };
  }

  function calculateTotalSpending(userbill) {
    return userbill.reduce((sum, bill) => {
      const amount = bill["json"].total_amount;
      console.log(bill["json"].time_stamp)
      if (typeof amount === "string") {
        const digits = amount.match(/\d+(\.\d+)?/);
        if (digits) {
          return sum + parseFloat(digits[0]);
        }
      } else if (typeof amount === "number") {
        return sum + amount;
      }
      return sum;
    }, 0);
  }
  
  console.log(value)
  const chatData = userData?.chatLogs != null;
  const budgetObject = {
    month: budget,
    week: (budget) / 4,
    day: (budget) / 30
  }

  const data = {
    This_Month: { spent: combinedSpending.month, budget: budget, percentage: Math.round((combinedSpending.month / budget) * 100) },
    This_week: { spent: combinedSpending.week, budget: Math.round(budget / 4), percentage: Math.round((combinedSpending.week / (budget / 4)) * 100) },
    Today: { spent: combinedSpending.today, budget: Math.round(budget / 30), percentage: Math.round((combinedSpending.today / (budget / 30)) * 100) },
    overall: { spent: combinedSpending.total, budget: budget, percentage: Math.round((combinedSpending.total / budget) * 100) }
  };

  const userSpendings = {
    today: { spent: combinedSpending.today, budget: Math.round(budget / 30) },
    this_week: { spent: combinedSpending.week, budget: Math.round(budget / 4) },
    this_month: { spent: combinedSpending.month, budget: budget },
    overall: { spent: combinedSpending.total, budget: budget }
  }

  const updateUserSpendings = useCallback(async () => {
    try {
      const userRef = doc(db, "users", useruid);
      await updateDoc(userRef, {
        userspendings: userSpendings
      });
      console.log("✅ userspendings updated successfully.");
      
      // ===== CHECK FOR BUDGET ALERTS AFTER UPDATING =====
      const user = auth.currentUser;
      console.log('🔍 Checking alerts for user:', user?.email);
      console.log('📊 User spendings:', userSpendings);
      
      if (user?.email) {
        const exceededBudgets = Object.entries(userSpendings).filter(([, data]) => data.spent > data.budget);
        console.log('⚠️ Exceeded budgets:', exceededBudgets);
        
        if (exceededBudgets.length > 0 && shouldSendAlert(user.email, exceededBudgets)) {
          console.log('📧 Sending alert to:', user.email);
          await checkBudgetAlerts(userSpendings, user.email);
        }
      }
      // ===== END BUDGET ALERT CHECK =====
      
    } catch (error) {
      console.error("❌ Error updating userspendings:", error);
    }
  }, [useruid, userSpendings]);

  // Call updateUserSpendings when data is ready (including Razorpay transactions)
  useEffect(() => {
    const updateData = async () => {
      if (userData && useruid && budget) {
        await updateUserSpendings();
      }
    };
    updateData();
  }, [userData, useruid, budget, combinedSpending.total, combinedSpending.today, combinedSpending.week, combinedSpending.month, updateUserSpendings]);

  console.log(budgetObject)
  if (loading) return <SkeletonLayout />;

  return (
    <div>
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-start p-6 pt-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-black rounded-full"></div>
              </div>
              <span className="text-xl text-white font-semibold">UTrack</span>
            </div>
          </div>

          {/* Spending Overview */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-4">
              {Object.entries(data).map(([key, values], index) => (
                <SpendingCard
                  key={index}
                  title={`${key.charAt(0).toUpperCase() + key.slice(1)}`}
                  spent={`${values.spent}/-`}
                  budget={`${values.budget}/-`}
                  color="#10B981"
                  percentage={values.percentage}
                />
              ))}
            </div>
          </div>

          {/* Recent Receipts */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Recent receipts</h2>
              <button className="text-gray-400 text-sm hover:text-white transition-colors">
                view all
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
              {Array.isArray(userData?.user_bills) && userData.user_bills.length > 0 ? (
                userData.user_bills.map((bill, index) => (
                  <ReceiptItem key={index} amount={bill["json"]} type="expense" onViewClick={() => openModal(bill["html"])} />
                ))
              ) : (
                <div className="bg-gray-800 text-white p-4 rounded-lg text-center shadow-md max-w-xs mx-auto">
                  <p className="text-lg font-semibold mb-2">No receipts added yet</p>
                  <p className="text-sm text-gray-400">
                    Use our <span className="text-blue-400 font-medium">advanced receipt scanning</span> tool to get started!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Razorpay Transactions */}
          {Array.isArray(userData?.user_transactions) && userData.user_transactions.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Recent payments</h2>
                <a href="/transactions" className="text-gray-400 text-sm hover:text-white transition-colors">
                  view all
                </a>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                {userData.user_transactions.slice(0, 5).map((transaction, index) => (
                  <div key={index} className="bg-gray-700 p-4 rounded-lg flex flex-col items-center justify-between min-w-[120px] max-w-[140px]">
                    <div className="text-xs text-gray-200 mb-1 whitespace-nowrap">Payment</div>
                    <div className="text-sm font-semibold mb-2 text-blue-400">
                      ₹{parseFloat(transaction.amount).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400 mb-2 text-center">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      transaction.status === 'captured' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {transaction.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal */}
          {modalHtml && (
            <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center px-4">
              <div className="bg-black rounded-lg max-w-full max-h-[90vh] overflow-auto hide-scrollbar relative scroll p-6 shadow-lg">
                <button
                  onClick={closeModal}
                  className="absolute top-2 right-2 text-white text-xl font-bold"
                >
                  &times;
                </button>
                <div dangerouslySetInnerHTML={{ __html: modalHtml }} />
              </div>
            </div>
          )}

          {/* Recent Chat */}
          {chats ? (
            <div className="chat-list">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Recent chat</h2>
                <button className="text-gray-400 text-sm hover:text-white transition-colors">
                  view all
                </button>
              </div>
              {dbchats.map((chat, index) => (
                <div
                  key={index}
                  className='chat-item'
                  onClick={() => console.log("clicked")}
                >
                  <span>{chat.timestamp}</span>
                  {dbchats[index].chat[0].user.length > 0 && (
                    <p>{chat.chat[0].user.substring(0, 30)}...</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Recent chat</h2>
                <button className="text-gray-400 text-sm hover:text-white transition-colors">
                  view all
                </button>
              </div>
              <div>
                <ChatItem
                  is_chat={chatData}
                  title="Food & Delivery"
                  description="You spent ₹2,350 on food delivery this week 🍕 — that's 15% more than last week. Want to set a weekly limit?"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;