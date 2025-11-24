import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, PlusCircle, DollarSign, Calendar, Edit2, Trash2, ArrowRightLeft, Mail } from 'lucide-react';

const FamilyBudgetApp = () => {
  // Sample initial data
  const [accounts, setAccounts] = useState([]);

  // Envelopes with current balances
  const [envelopes, setEnvelopes] = useState([]);

  const [transactions, setTransactions] = useState([]);

  const [activeTab, setActiveTab] = useState('overview');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddEnvelope, setShowAddEnvelope] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showMoveMoneyModal, setShowMoveMoneyModal] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  // Form states
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    category: '',
    amount: '',
    account: '',
    envelope: '',
    description: ''
  });

  const [newAccount, setNewAccount] = useState({
    name: '',
    type: 'checking',
    balance: ''
  });

  const [newEnvelope, setNewEnvelope] = useState({
    name: '',
    budgetLimit: '',
    color: '#3b82f6'
  });

  const [allocateForm, setAllocateForm] = useState({
    amount: '',
    envelope: '',
    account: ''
  });

  const [moveMoneyForm, setMoveMoneyForm] = useState({
    amount: '',
    fromEnvelope: '',
    toEnvelope: ''
  });

  // Calculate totals
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  
  const currentMonthTransactions = transactions.filter(t => {
    const transDate = new Date(t.date);
    const now = new Date();
    return transDate.getMonth() === now.getMonth() && transDate.getFullYear() === now.getFullYear();
  });

  const monthlyIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlySavings = monthlyIncome - monthlyExpenses;

  // Envelope calculations
  const totalEnvelopeBalance = envelopes.reduce((sum, env) => sum + env.balance, 0);
  
  // Unallocated money = income from CHECKING accounts only that hasn't been allocated
  // Retirement/Savings/Investment income doesn't need allocation
  const unallocatedByAccount = {};
  
  currentMonthTransactions.forEach(t => {
    const account = accounts.find(a => a.id === t.account);
    
    // Only track unallocated money for checking accounts
    if (account && account.type === 'checking') {
      if (t.type === 'income') {
        unallocatedByAccount[t.account] = (unallocatedByAccount[t.account] || 0) + t.amount;
      } else if (t.type === 'allocation') {
        unallocatedByAccount[t.account] = (unallocatedByAccount[t.account] || 0) - t.amount;
      }
    }
  });
  
  // Total unallocated across all checking accounts
  const unallocatedMoney = Object.values(unallocatedByAccount).reduce((sum, amount) => sum + amount, 0);
  
  // Find which checking account(s) have unallocated money
  const accountsWithUnallocated = Object.entries(unallocatedByAccount)
    .filter(([_, amount]) => amount > 0)
    .map(([accountId, amount]) => ({
      account: accounts.find(a => a.id === parseInt(accountId)),
      amount
    }));

  // Envelope spending data
  const envelopeData = useMemo(() => {
    return envelopes.map(envelope => {
      const spent = envelope.budgetLimit - envelope.balance;
      return {
        ...envelope,
        spent,
        remaining: envelope.balance,
        percentage: (spent / envelope.budgetLimit) * 100
      };
    });
  }, [envelopes]);

  // Spending by category for pie chart
  const spendingByCategory = useMemo(() => {
    const categoryMap = {};
    currentMonthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
      });
    return Object.entries(categoryMap).map(([name, value]) => {
      const envelope = envelopes.find(e => e.name === name);
      return {
        name,
        value,
        color: envelope?.color || '#6b7280'
      };
    });
  }, [currentMonthTransactions, envelopes]);

  // Monthly trend data (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toLocaleString('default', { month: 'short' });
      
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear();
      });

      const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      months.push({
        month: monthStr,
        income,
        expenses,
        savings: income - expenses
      });
    }
    return months;
  }, [transactions]);

  // Handlers
  const handleAddTransaction = () => {
    if (!newTransaction.amount || !newTransaction.category || !newTransaction.account) return;

    const transaction = {
      id: Date.now(),
      ...newTransaction,
      amount: parseFloat(newTransaction.amount),
      account: parseInt(newTransaction.account),
      envelope: newTransaction.envelope ? parseInt(newTransaction.envelope) : null
    };

    setTransactions([transaction, ...transactions]);

    // Update account balance
    const accountIndex = accounts.findIndex(a => a.id === parseInt(newTransaction.account));
    if (accountIndex !== -1) {
      const updatedAccounts = [...accounts];
      if (transaction.type === 'income') {
        updatedAccounts[accountIndex].balance += transaction.amount;
      } else if (transaction.type === 'expense') {
        updatedAccounts[accountIndex].balance -= transaction.amount;
        
        // Deduct from envelope if specified
        if (transaction.envelope) {
          const envelopeIndex = envelopes.findIndex(e => e.id === transaction.envelope);
          if (envelopeIndex !== -1) {
            const updatedEnvelopes = [...envelopes];
            updatedEnvelopes[envelopeIndex].balance -= transaction.amount;
            setEnvelopes(updatedEnvelopes);
          }
        }
      }
      setAccounts(updatedAccounts);
    }

    setNewTransaction({
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      category: '',
      amount: '',
      account: '',
      envelope: '',
      description: ''
    });
    setShowAddTransaction(false);
  };

  const handleAllocateMoney = () => {
    if (!allocateForm.amount || !allocateForm.envelope || !allocateForm.account) return;

    const amount = parseFloat(allocateForm.amount);
    
    // Add allocation transaction
    const transaction = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      type: 'allocation',
      category: envelopes.find(e => e.id === parseInt(allocateForm.envelope))?.name || 'Allocation',
      amount: amount,
      account: parseInt(allocateForm.account),
      envelope: parseInt(allocateForm.envelope),
      description: 'Money allocated to envelope'
    };

    setTransactions([transaction, ...transactions]);

    // Update envelope balance
    const envelopeIndex = envelopes.findIndex(e => e.id === parseInt(allocateForm.envelope));
    if (envelopeIndex !== -1) {
      const updatedEnvelopes = [...envelopes];
      updatedEnvelopes[envelopeIndex].balance += amount;
      setEnvelopes(updatedEnvelopes);
    }

    setAllocateForm({ amount: '', envelope: '', account: '' });
    setShowAllocateModal(false);
  };

  const openAllocateModal = () => {
    // Auto-select account if there's only one with unallocated money
    const accountsWithMoney = Object.entries(unallocatedByAccount)
      .filter(([_, amount]) => amount > 0);
    
    if (accountsWithMoney.length === 1) {
      setAllocateForm({ 
        amount: '', 
        envelope: '', 
        account: accountsWithMoney[0][0] 
      });
    } else {
      setAllocateForm({ amount: '', envelope: '', account: '' });
    }
    
    setShowAllocateModal(true);
  };

  const handleMoveMoney = () => {
    if (!moveMoneyForm.amount || !moveMoneyForm.fromEnvelope || !moveMoneyForm.toEnvelope) return;

    const amount = parseFloat(moveMoneyForm.amount);
    const fromIndex = envelopes.findIndex(e => e.id === parseInt(moveMoneyForm.fromEnvelope));
    const toIndex = envelopes.findIndex(e => e.id === parseInt(moveMoneyForm.toEnvelope));

    if (fromIndex === -1 || toIndex === -1) return;
    if (envelopes[fromIndex].balance < amount) {
      alert('Insufficient funds in source envelope!');
      return;
    }

    const updatedEnvelopes = [...envelopes];
    updatedEnvelopes[fromIndex].balance -= amount;
    updatedEnvelopes[toIndex].balance += amount;
    setEnvelopes(updatedEnvelopes);

    setMoveMoneyForm({ amount: '', fromEnvelope: '', toEnvelope: '' });
    setShowMoveMoneyModal(false);
  };

  const handleAddAccount = () => {
    if (!newAccount.name || !newAccount.balance) return;

    const account = {
      id: Date.now(),
      ...newAccount,
      balance: parseFloat(newAccount.balance)
    };

    setAccounts([...accounts, account]);
    setNewAccount({ name: '', type: 'checking', balance: '' });
    setShowAddAccount(false);
  };

  const handleAddEnvelope = () => {
    if (!newEnvelope.name || !newEnvelope.budgetLimit) return;

    const envelope = {
      id: Date.now(),
      ...newEnvelope,
      balance: 0, // New envelopes start with $0
      budgetLimit: parseFloat(newEnvelope.budgetLimit)
    };

    setEnvelopes([...envelopes, envelope]);
    setNewEnvelope({ name: '', budgetLimit: '', color: '#3b82f6' });
    setShowAddEnvelope(false);
  };

  const handleDeleteAccount = (id) => {
    if (window.confirm('Are you sure you want to delete this account? This cannot be undone.')) {
      setAccounts(accounts.filter(a => a.id !== id));
    }
  };

  const handleEditAccount = (account) => {
    setEditingAccount({ ...account });
    setShowEditAccount(true);
  };

  const handleUpdateAccount = () => {
    if (!editingAccount || !editingAccount.name || editingAccount.balance === '') return;
    
    const updatedAccounts = accounts.map(acc => 
      acc.id === editingAccount.id 
        ? { ...editingAccount, balance: parseFloat(editingAccount.balance) }
        : acc
    );
    
    setAccounts(updatedAccounts);
    setShowEditAccount(false);
    setEditingAccount(null);
  };

  const handleDeleteEnvelope = (id) => {
    const envelope = envelopes.find(e => e.id === id);
    if (envelope && envelope.balance > 0) {
      if (!window.confirm(`This envelope has $${envelope.balance} remaining. Are you sure you want to delete it?`)) {
        return;
      }
    }
    setEnvelopes(envelopes.filter(e => e.id !== id));
  };

  const handleDeleteTransaction = (id) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      // Reverse the account balance change
      const accountIndex = accounts.findIndex(a => a.id === transaction.account);
      if (accountIndex !== -1) {
        const updatedAccounts = [...accounts];
        if (transaction.type === 'income') {
          updatedAccounts[accountIndex].balance -= transaction.amount;
        } else if (transaction.type === 'expense') {
          updatedAccounts[accountIndex].balance += transaction.amount;
          
          // Restore envelope balance if it was an expense from an envelope
          if (transaction.envelope) {
            const envelopeIndex = envelopes.findIndex(e => e.id === transaction.envelope);
            if (envelopeIndex !== -1) {
              const updatedEnvelopes = [...envelopes];
              updatedEnvelopes[envelopeIndex].balance += transaction.amount;
              setEnvelopes(updatedEnvelopes);
            }
          }
        } else if (transaction.type === 'allocation') {
          // Reverse allocation
          if (transaction.envelope) {
            const envelopeIndex = envelopes.findIndex(e => e.id === transaction.envelope);
            if (envelopeIndex !== -1) {
              const updatedEnvelopes = [...envelopes];
              updatedEnvelopes[envelopeIndex].balance -= transaction.amount;
              setEnvelopes(updatedEnvelopes);
            }
          }
        }
        setAccounts(updatedAccounts);
      }
    }
    setTransactions(transactions.filter(t => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Family Budget Manager</h1>
          <p className="text-slate-600">Track your finances, manage budgets, and grow your wealth</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 shadow-sm">
          {['overview', 'envelopes', 'transactions', 'accounts'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Allocate Money Modal - Available on all tabs */}
        {showAllocateModal && (
          <div className="mb-6 bg-white rounded-xl p-6 shadow-lg border-2 border-blue-500">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Allocate Money to Envelope</h3>
            
            {accountsWithUnallocated.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">Available to allocate:</p>
                {accountsWithUnallocated.map(({ account, amount }) => (
                  <p key={account.id} className="text-sm text-blue-700">
                    {account.name}: ${amount.toLocaleString()}
                  </p>
                ))}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={allocateForm.amount}
                  onChange={(e) => setAllocateForm({ ...allocateForm, amount: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  max={unallocatedMoney}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 mt-1">Max: ${unallocatedMoney.toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To Envelope</label>
                <select
                  value={allocateForm.envelope}
                  onChange={(e) => setAllocateForm({ ...allocateForm, envelope: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Envelope</option>
                  {envelopes.map(env => (
                    <option key={env.id} value={env.id}>{env.name} (${env.balance})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From Account</label>
                <select
                  value={allocateForm.account}
                  onChange={(e) => setAllocateForm({ ...allocateForm, account: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Account</option>
                  {accountsWithUnallocated.map(({ account }) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAllocateMoney}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Allocate Money
              </button>
              <button
                onClick={() => setShowAllocateModal(false)}
                className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <Wallet className="w-8 h-8 opacity-80" />
                  <span className="text-sm opacity-80">Total Balance</span>
                </div>
                <div className="text-3xl font-bold">${totalBalance.toLocaleString()}</div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <Mail className="w-8 h-8 opacity-80" />
                  <span className="text-sm opacity-80">In Envelopes</span>
                </div>
                <div className="text-3xl font-bold">${totalEnvelopeBalance.toLocaleString()}</div>
              </div>

              <div className={`bg-gradient-to-br ${unallocatedMoney > 0 ? 'from-amber-500 to-amber-600' : 'from-slate-400 to-slate-500'} rounded-xl p-6 text-white shadow-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 opacity-80" />
                  <span className="text-sm opacity-80">Unallocated</span>
                </div>
                <div className="text-3xl font-bold">${unallocatedMoney.toLocaleString()}</div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 opacity-80" />
                  <span className="text-sm opacity-80">Monthly Income</span>
                </div>
                <div className="text-3xl font-bold">${monthlyIncome.toLocaleString()}</div>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <TrendingDown className="w-8 h-8 opacity-80" />
                  <span className="text-sm opacity-80">Monthly Expenses</span>
                </div>
                <div className="text-3xl font-bold">${monthlyExpenses.toLocaleString()}</div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Spending by Category */}
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Spending by Category</h3>
                {spendingByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={spendingByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {spendingByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    No expense data for this month
                  </div>
                )}
              </div>

              {/* Monthly Trend */}
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-slate-800 mb-4">6-Month Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" />
                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                    <Line type="monotone" dataKey="savings" stroke="#3b82f6" strokeWidth={2} name="Savings" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Budget Progress */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800">Envelope Balances</h3>
                {unallocatedMoney > 0 && (
                  <button
                    onClick={openAllocateModal}
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2 text-sm"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Allocate ${unallocatedMoney.toLocaleString()}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {envelopeData.map(envelope => (
                  <div key={envelope.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-slate-700">{envelope.name}</span>
                      <span className="text-sm text-slate-500">${envelope.spent} / ${envelope.budgetLimit}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 mb-2">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          envelope.percentage > 90 ? 'bg-red-500' : envelope.percentage > 70 ? 'bg-orange-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(envelope.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-semibold ${envelope.remaining > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${envelope.remaining.toFixed(2)} remaining
                      </span>
                      <span className="text-slate-500">{envelope.percentage.toFixed(0)}% used</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Envelopes Tab */}
        {activeTab === 'envelopes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Envelope Budget</h2>
              <div className="flex gap-2">
                {unallocatedMoney > 0 && (
                  <button
                    onClick={openAllocateModal}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <PlusCircle className="w-5 h-5" />
                    Allocate ${unallocatedMoney.toLocaleString()}
                  </button>
                )}
                <button
                  onClick={() => setShowMoveMoneyModal(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <ArrowRightLeft className="w-5 h-5" />
                  Move Money
                </button>
                <button
                  onClick={() => setShowAddEnvelope(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <PlusCircle className="w-5 h-5" />
                  Add Envelope
                </button>
              </div>
            </div>

            {/* Unallocated Money Warning */}
            {unallocatedMoney > 0 && (
              <div className="bg-amber-50 border-2 border-amber-500 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-amber-900 mb-1">Unallocated Money: ${unallocatedMoney.toLocaleString()}</h3>
                    <p className="text-amber-700">You have income that hasn't been assigned to any envelope yet. Allocate it to stay on budget!</p>
                  </div>
                  <button
                    onClick={openAllocateModal}
                    className="bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors font-semibold"
                  >
                    Allocate Now
                  </button>
                </div>
              </div>
            )}

            {/* Move Money Modal */}
            {showMoveMoneyModal && (
              <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-purple-500">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Move Money Between Envelopes</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">From Envelope</label>
                    <select
                      value={moveMoneyForm.fromEnvelope}
                      onChange={(e) => setMoveMoneyForm({ ...moveMoneyForm, fromEnvelope: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select Envelope</option>
                      {envelopes.map(env => (
                        <option key={env.id} value={env.id}>{env.name} (${env.balance})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                    <input
                      type="number"
                      value={moveMoneyForm.amount}
                      onChange={(e) => setMoveMoneyForm({ ...moveMoneyForm, amount: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">To Envelope</label>
                    <select
                      value={moveMoneyForm.toEnvelope}
                      onChange={(e) => setMoveMoneyForm({ ...moveMoneyForm, toEnvelope: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select Envelope</option>
                      {envelopes.map(env => (
                        <option key={env.id} value={env.id}>{env.name} (${env.balance})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleMoveMoney}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Move Money
                  </button>
                  <button
                    onClick={() => setShowMoveMoneyModal(false)}
                    className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Add Envelope Form */}
            {showAddEnvelope && (
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-slate-800 mb-4">New Envelope</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Envelope Name</label>
                    <input
                      type="text"
                      value={newEnvelope.name}
                      onChange={(e) => setNewEnvelope({ ...newEnvelope, name: e.target.value })}
                      placeholder="e.g., Vacation Fund"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Budget</label>
                    <input
                      type="number"
                      value={newEnvelope.budgetLimit}
                      onChange={(e) => setNewEnvelope({ ...newEnvelope, budgetLimit: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                    <input
                      type="color"
                      value={newEnvelope.color}
                      onChange={(e) => setNewEnvelope({ ...newEnvelope, color: e.target.value })}
                      className="w-full h-10 px-1 py-1 border border-slate-300 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleAddEnvelope}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Envelope
                  </button>
                  <button
                    onClick={() => setShowAddEnvelope(false)}
                    className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Envelope Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {envelopeData.map(envelope => (
                <div key={envelope.id} className="bg-white rounded-xl p-6 shadow-lg border-l-4 relative" style={{ borderLeftColor: envelope.color }}>
                  <button
                    onClick={() => handleDeleteEnvelope(envelope.id)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-red-600 transition-colors"
                    title="Delete envelope"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="flex justify-between items-start mb-4 pr-8">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{envelope.name}</h3>
                      <p className="text-sm text-slate-600">Budget: ${envelope.budgetLimit.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-800">${envelope.balance.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">available</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-4 mb-3">
                    <div
                      className={`h-4 rounded-full transition-all ${
                        envelope.percentage > 90 ? 'bg-red-500' : envelope.percentage > 70 ? 'bg-orange-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(envelope.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Spent: ${envelope.spent.toLocaleString()}</span>
                    <span className="font-semibold text-slate-700">{envelope.percentage.toFixed(0)}% used</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Envelope Chart */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Envelope Comparison</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={envelopeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="balance" fill="#10b981" name="Available" />
                  <Bar dataKey="spent" fill="#ef4444" name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Transactions</h2>
              <button
                onClick={() => setShowAddTransaction(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                Add Transaction
              </button>
            </div>

            {/* Add Transaction Form */}
            {showAddTransaction && (
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-slate-800 mb-4">New Transaction</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={newTransaction.date}
                      onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                    <select
                      value={newTransaction.type}
                      onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <input
                      type="text"
                      value={newTransaction.category}
                      onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                      placeholder="e.g., Groceries"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                    <input
                      type="number"
                      value={newTransaction.amount}
                      onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account</label>
                    <select
                      value={newTransaction.account}
                      onChange={(e) => setNewTransaction({ ...newTransaction, account: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Account</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                  {newTransaction.type === 'expense' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Envelope (Optional)</label>
                      <select
                        value={newTransaction.envelope}
                        onChange={(e) => setNewTransaction({ ...newTransaction, envelope: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">None</option>
                        {envelopes.map(env => (
                          <option key={env.id} value={env.id}>{env.name} (${env.balance} available)</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className={newTransaction.type === 'expense' ? '' : 'md:col-span-2'}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={newTransaction.description}
                      onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                      placeholder="Optional notes"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleAddTransaction}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Transaction
                  </button>
                  <button
                    onClick={() => setShowAddTransaction(false)}
                    className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Transaction List */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Envelope</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Account</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {transactions.map(transaction => {
                      const account = accounts.find(a => a.id === transaction.account);
                      const envelope = transaction.envelope ? envelopes.find(e => e.id === transaction.envelope) : null;
                      return (
                        <tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            {new Date(transaction.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              transaction.type === 'income' ? 'bg-green-100 text-green-800' :
                              transaction.type === 'expense' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {transaction.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">{transaction.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {envelope ? (
                              <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: `${envelope.color}20`, color: envelope.color }}>
                                {envelope.name}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{transaction.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{account?.name || 'N/A'}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${
                            transaction.type === 'income' ? 'text-green-600' : transaction.type === 'allocation' ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'income' ? '+' : transaction.type === 'allocation' ? '→' : '-'}${transaction.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Accounts</h2>
              <button
                onClick={() => setShowAddAccount(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                Add Account
              </button>
            </div>

            {/* Add Account Form */}
            {showAddAccount && (
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-slate-800 mb-4">New Account</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
                    <input
                      type="text"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      placeholder="e.g., Chase Checking"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Type</label>
                    <select
                      value={newAccount.type}
                      onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                      <option value="retirement">Retirement</option>
                      <option value="investment">Investment</option>
                      <option value="credit">Credit Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Balance</label>
                    <input
                      type="number"
                      value={newAccount.balance}
                      onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleAddAccount}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Account
                  </button>
                  <button
                    onClick={() => setShowAddAccount(false)}
                    className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Edit Account Modal */}
            {showEditAccount && editingAccount && (
              <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-blue-500">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Edit Account</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
                    <input
                      type="text"
                      value={editingAccount.name}
                      onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Type</label>
                    <select
                      value={editingAccount.type}
                      onChange={(e) => setEditingAccount({ ...editingAccount, type: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                      <option value="retirement">Retirement</option>
                      <option value="investment">Investment</option>
                      <option value="credit">Credit Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Balance</label>
                    <input
                      type="number"
                      value={editingAccount.balance}
                      onChange={(e) => setEditingAccount({ ...editingAccount, balance: e.target.value })}
                      step="0.01"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleUpdateAccount}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Update Account
                  </button>
                  <button
                    onClick={() => {
                      setShowEditAccount(false);
                      setEditingAccount(null);
                    }}
                    className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Account Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map(account => (
                <div key={account.id} className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-6 text-white shadow-lg relative">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm text-slate-300 uppercase tracking-wide">{account.type}</p>
                      <h3 className="text-xl font-bold mt-1">{account.name}</h3>
                    </div>
                    <Wallet className="w-8 h-8 text-slate-400" />
                  </div>
                  <div className="mt-6">
                    <p className="text-sm text-slate-300 mb-1">Current Balance</p>
                    <p className="text-3xl font-bold">${account.balance.toLocaleString()}</p>
                  </div>
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <button
                      onClick={() => handleEditAccount(account)}
                      className="text-slate-400 hover:text-blue-400 transition-colors"
                      title="Edit account"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete account"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Account Summary */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Account Summary</h3>
              <div className="space-y-3">
                {['checking', 'savings', 'retirement', 'investment', 'credit'].map(type => {
                  const typeAccounts = accounts.filter(a => a.type === type);
                  const total = typeAccounts.reduce((sum, a) => sum + a.balance, 0);
                  if (typeAccounts.length === 0) return null;
                  return (
                    <div key={type} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                      <span className="font-semibold text-slate-700 capitalize">{type} ({typeAccounts.length})</span>
                      <span className="text-lg font-bold text-slate-800">${total.toLocaleString()}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <span className="font-bold text-blue-900">Total Net Worth</span>
                  <span className="text-2xl font-bold text-blue-900">${totalBalance.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilyBudgetApp;