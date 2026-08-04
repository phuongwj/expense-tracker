import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import AddTransactionModal from '../components/AddTransactionModal'
import AddGroupExpenseModal from '../components/AddGroupExpenseModal'
import { getPersonalTransactions, getGroupTransactions, type Transaction } from "../services/transactions";
import { getGroups, getGroup } from '../services/groupService'
import { getGlobalBalances, getGroupBalances, type Balance } from '../services/transactions'
import type { GroupSummary, GroupDetailMember } from '@expense-tracker/shared/groups'
import { getErrorMessage, SUPPORT_EMAIL } from '../utils/errors'

export default function Dashboard() {
  const [addOpen, setAddOpen] = useState(false)
  const [view, setView] = useState('personal')
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState<Balance[]>([])
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map())
  const [userGroups, setUserGroups] = useState<GroupSummary[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupDetailMember[]>([])
  const [error, setError] = useState<string | null>(null)

  async function loadTransactions() {
    try {
      if (view === 'personal') {
        const data = await getPersonalTransactions()
        setTransactions(data)
      } else {
        const data = await getGroupTransactions(view)
        setTransactions(
          data.map((t: Transaction) => ({ ...t, amount: Number(t.amount) }))
        )
      }
    } catch (err) {
      setError(getErrorMessage(err, `Unable to load transactions. Please try again, or contact ${SUPPORT_EMAIL} if the problem persists.`))
    }
  }

  //get the net balances for the user. if personal view: all groups, if group view: that view only
  async function loadGlobalBalances() {
    try {
      if (view === 'personal') {
        const [balancesRes, groups] = await Promise.all([
          getGlobalBalances(),
          getGroups(),
        ])
        setBalances(balancesRes.balances)

        const groupDetails = await Promise.all(
          groups.map((g) => getGroup(g.id))
        )

        const nameMap = new Map<string, string>()
        for (const detail of groupDetails) {
          for (const m of detail.members) {
            nameMap.set(m.userId, `${m.firstName} ${m.lastName}`)
          }
        }
        setUserNames(nameMap)
        setGroupMembers([])
      } else {
        const [balRes, groupDetail] = await Promise.all([
          getGroupBalances(view),
          getGroup(view),
        ])
        setBalances(balRes.balances)
        setGroupMembers(groupDetail.members)

        const nameMap = new Map<string, string>()
        for (const m of groupDetail.members) {
          nameMap.set(m.userId, `${m.firstName} ${m.lastName}`)
        }
        setUserNames(nameMap)
      }
    } catch (err) {
      setError(getErrorMessage(err, `Unable to load balances. Please try again, or contact ${SUPPORT_EMAIL} if the problem persists.`))
    }
  }


    useEffect(() => {
      setError(null)
      loadTransactions()
      loadGlobalBalances()
    }, [view])

    useEffect(() => {
      getGroups().then(setUserGroups).catch(() => setUserGroups([]))
    }, [])

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString();
  }

  //functions that use the fetched transactions to calculate current balance, expenses & income
  function calculateBalance() {
    return transactions.reduce((balance, transaction) => {
      if (transaction.type === "income") {
        return balance + Number(transaction.amount);
      }

      return balance - Number(transaction.amount);
    }, 0);
  }

  function calculateIncome() {
    return transactions
      .filter((transaction) => transaction.type === "income")
      .reduce((total, transaction) => total + Number(transaction.amount), 0);
  }

  function calculateExpenses() {
    return transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((total, transaction) => total + Number(transaction.amount), 0);
  }

  const currentBalance = calculateBalance();
  const income = calculateIncome();
  const expenses = calculateExpenses();

  const mostRecent = transactions.slice(0, 5);
  return (
    <Layout
      title="Dashboard"
      headerActions={
        <>
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className="h-9 border border-gray-200 rounded-lg px-3 text-sm bg-white text-gray-700"
          >
            <option value="personal">📍 Personal View</option>
            {userGroups.map((g) => (
              <option key={g.id} value={g.id}>
                👥 {g.name}
              </option>
            ))}
          </select>
          <button className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">🔔</button>
          <button
            onClick={() => setAddOpen(true)}
            className="h-9 px-4 rounded-lg bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240] flex items-center gap-1"
          >
            + Add Transaction <span className="text-[10px] border border-white/30 rounded px-1 ml-1">T</span>
          </button>
        </>
      }
    >
    {error && <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">{error}</div>}
    <div className={`grid grid-cols-1 ${view === 'personal' ? 'sm:grid-cols-3' : ''} gap-4 mb-6`}>
      {view === 'personal' && (
        <Card
          label="Current balance"
          value={`$${currentBalance.toFixed(2)}`}
          sub="Updated from transactions"
        />
      )}
      {view === 'personal' && (
        <Card
          label="Income"
          value={`+$${income.toFixed(2)}`}
          valueClass="text-green-700"
          sub={`${transactions.filter(t => t.type === "income").length} transactions`}
        />
      )}
      <Card
        label={view === 'personal' ? 'Expenses' : 'Total spent'}
        value={`−$${expenses.toFixed(2)}`}
        valueClass="text-red-700"
        sub={`${transactions.length} transaction${transactions.length === 1 ? '' : 's'}`}
      />
    </div>
    <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
        <Link to="/transactions" className="text-sm text-[#3D6B4F] font-medium hover:underline">
          See all →
        </Link>
      </div>
      <div className="divide-y divide-gray-100">
        {mostRecent.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-sm font-medium text-gray-900">{t.description}</div>
                <div className="text-xs text-gray-400">
                  {t.category ?? ""} · {formatDate(t.transactionDate)}
                </div>
              </div>
            </div>
            <div className={`text-sm font-semibold ${ 
                t.type === 'expense' ? 'text-red-700' : 'text-green-700'}`}>
              {t.type === 'expense' ? '−' : '+'}${Number(t.amount).toFixed(2)}  
            </div>
          </div>
        ))}
      </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">
            {view === 'personal' ? 'Group Balances' : `Balances — ${userGroups.find(g => g.id === view)?.name ?? ''}`}
          </h2>
          <Link to="/groups" className="text-sm text-[#3D6B4F] font-medium hover:underline">
            View groups →
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {balances.length === 0 && (
            <div className="text-sm text-gray-400">All settled up ✓</div>
          )}
          {balances.map((b) => (
            <div
              key={b.userId}
              className={`rounded-xl px-4 py-3 ${
                b.direction === 'you_owe' ? 'bg-red-50' : 'bg-green-50'
              }`}
            >
              <div className="text-sm font-medium text-gray-900">
                {userNames.get(b.userId) ?? 'Unknown user'}
              </div>
              <div
                className={`text-sm font-semibold ${
                  b.direction === 'you_owe' ? 'text-red-700' : 'text-green-700'
                }`}
              >
                {b.direction === 'you_owe' ? `You owe $${b.amount.toFixed(2)}` : `Owes you $${b.amount.toFixed(2)}`}
              </div>
            </div>
          ))}
        </div>
      </div>
      {view === 'personal' ? (
        <AddTransactionModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onCreated={loadTransactions}
        />
      ) : (
        <AddGroupExpenseModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            loadTransactions()
            loadGlobalBalances()
          }}
          groupId={view}
          members={groupMembers}
        />
      )}

    </Layout>
  )
}

function Card({
  label,
  value,
  sub,
  valueClass = 'text-gray-900',
}: {
  label: string
  value: string
  sub: string
  valueClass?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  )
}