import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getPersonalTransactions, getGroupTransactions, type Transaction } from '../services/transactions'
import { getGroups } from '../services/groupService'
import type { GroupSummary } from '@expense-tracker/shared/groups'

const ranges = ['Week', 'Month', 'Semester'] as const

function calculateTotalIncome(transactions: Transaction[]) {
  return transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0)
}


function calculateTotalExpenses(transactions: Transaction[]) {
  return transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0)
}

//group transaction amounts by category
function getCategoryBreakdown(
  transactions: Transaction[],
  totalExpenses: number
) {
  const categories: {
    name: string
    amount: number
    pct: number
  }[] = []

  transactions
    .filter(t => t.type === "expense")
    .forEach(t => {
      const categoryName = t.category ?? "Other"

      const existing = categories.find(
        c => c.name === categoryName
      )

      if (existing) {
        existing.amount += Number(t.amount)
      } else {
        categories.push({
          name: categoryName,
          amount: Number(t.amount),
          pct: 0
        })
      }
    })
  
  //calculate the percentage of each category based on the user's total
  categories.forEach(c => {
    c.pct = totalExpenses === 0
      ? 0
      : Math.round((c.amount / totalExpenses) * 100)
  })

  return categories
}

/**
// Transforms transaction data into chart data.
// Depending on the range selected by the user (week/month/semester),
// the transactions are assigned to different time intervals (ex: a day of the week, or a week of the month)
 */
function getChartData(
  transactions: Transaction[],
  range: "Week" | "Month" | "Semester"
) {
  const groups: {
    label: string
    income: number
    expense: number
    order: number
  }[] = []

  transactions.forEach(t => {
    const date = new Date(t.transactionDate)

    let label = ""
    let order = 0

    if (range === "Week") {
      label = date.toLocaleString(
        "default",
        { weekday: "short" }
      )

      const days = [
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
        "Sun"
      ]

      //order on X axis: Monday -> Sunday 
      order = days.indexOf(label)

    } else if (range === "Month") {

      const week = Math.ceil(date.getDate() / 7)

      label = `Week ${week}`
      //X axis order: Week 1 -> Week 5
      order = week

    } else {

      label = date.toLocaleString(
        "default",
        { month: "short" }
      )

      //X axis order: Jan -> Dec
      order = date.getMonth()
    }


    let existing = groups.find(
      g => g.label === label
    )

    if (!existing) {
      existing = {
        label,
        income: 0,
        expense: 0,
        order
      }

      groups.push(existing)
    }


    if (t.type === "income") {
      existing.income += Number(t.amount)
    } else {
      existing.expense += Number(t.amount)
    }
  })

  //sort so that earliest transaction appears first
  return groups.sort(
    (a,b) => a.order - b.order
  )
}
//used for getting the denominator when calculating avg daily spend.
function getDaysInRange(range: "Week" | "Month" | "Semester", refDate: Date) {

  if (range === "Week") {
    return 7
  }

  if (range === "Month") {
    //number of days in the current month
    return new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0).getDate()
  }

  //using 4 months for semester
  const fourMonthsAgo = new Date(refDate)
  fourMonthsAgo.setMonth(refDate.getMonth() - 4)
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round((refDate.getTime() - fourMonthsAgo.getTime()) / msPerDay)
}

export default function Visualisation() {
  const [range, setRange] = useState<(typeof ranges)[number]>('Month')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [view, setView] = useState('personal')
  const [userGroups, setUserGroups] = useState<GroupSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [referenceDate, setReferenceDate] = useState(new Date())

  function goToPrevious() {
    const d = new Date(referenceDate)
    if (range === 'Week') d.setDate(d.getDate() - 7)
    else if (range === 'Month') d.setMonth(d.getMonth() - 1)
    else d.setMonth(d.getMonth() - 4)
    setReferenceDate(d)
  }

function goToNext() {
  const d = new Date(referenceDate)
  if (range === 'Week') d.setDate(d.getDate() + 7)
  else if (range === 'Month') d.setMonth(d.getMonth() + 1)
  else d.setMonth(d.getMonth() + 4)

  //don't allow navigating into the future
  if (d > new Date()) return
  setReferenceDate(d)
}

function getRangeLabel(range: "Week" | "Month" | "Semester", refDate: Date) {
  if (range === 'Month') {
    return refDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  }
  if (range === 'Week') {
    const start = new Date(refDate)
    start.setDate(start.getDate() - 7)
    return `${start.toLocaleDateString('default', { month: 'short', day: 'numeric' })} – ${refDate.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`
  }
  const start = new Date(refDate)
  start.setMonth(start.getMonth() - 4)
  return `${start.toLocaleDateString('default', { month: 'short', year: 'numeric' })} – ${refDate.toLocaleDateString('default', { month: 'short', year: 'numeric' })}`
}

  useEffect(() => {
    async function loadTransactions() {
      setIsLoading(true)
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
        console.error("Failed to load transactions:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadTransactions()
  }, [view])

  useEffect(() => {
    getGroups().then(setUserGroups).catch(() => setUserGroups([]))
  }, [])

  //apply the weekly/monthly/semester filter on transaction data
  const filteredTransactions = transactions.filter((t) => {
    const date = new Date(t.transactionDate)

    if (range === 'Week') {
      const start = new Date(referenceDate)
      start.setDate(start.getDate() - 7)
      return date >= start && date <= referenceDate
    }

    if (range === 'Month') {
      return (
        date.getMonth() === referenceDate.getMonth() &&
        date.getFullYear() === referenceDate.getFullYear()
      )
    }

    if (range === 'Semester') {
      //treating semester as 4 months
      const start = new Date(referenceDate)
      start.setMonth(start.getMonth() - 4)
      return date >= start && date <= referenceDate
    }

    return true
  })


const income = calculateTotalIncome(filteredTransactions)

const expenses = calculateTotalExpenses(filteredTransactions)

const byCategory = getCategoryBreakdown(filteredTransactions, expenses)

//category that has the highest total expenses
const biggestExpense = [...byCategory].sort((a, b) => b.amount - a.amount)[0]

const chartData = getChartData(
  filteredTransactions,
  range
)

  //use 1 as fallback to avoid division by 0 error 
  const maxChartAmount = Math.max(
    ...chartData.flatMap(data => [data.income, data.expense]),
    1
  )

  const daysInRange = getDaysInRange(range, referenceDate);

  return (
    <Layout
      title="Spending Visualisation"
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
          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRange(r)
                  setReferenceDate(new Date())
                }}
                className={`h-9 px-4 text-sm font-medium ${
                  range === r ? 'bg-[#3D6B4F] text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </>
      }
    >
    {isLoading ? (
    <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-400">
      Loading…
    </div>
  ) : (
  <>
    <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-semibold text-gray-900">Income vs Expenses - {range || ""}</h2>
          <p className="text-xs text-gray-400">
            {getRangeLabel(range, referenceDate)} · {view === 'personal' ? 'Personal view' : userGroups.find((g) => g.id === view)?.name ?? 'Group view'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={goToPrevious} className="h-8 w-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">←</button>
          <button onClick={goToNext} className="h-8 w-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">→</button>
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">
          No transactions to show for this {range.toLowerCase()} {view === 'personal' ? 'in your personal view' : 'in this group'}.
        </p>
      ) : (
        <div className="flex items-end gap-6 h-48">
          {chartData.map((data) => (
            <div key={data.label} className="flex flex-col items-center gap-1">
              <div className="flex items-end gap-1 h-40">
                {view === 'personal' && (
                  <div
                    className="w-8 bg-[#2D5240] rounded-t"
                    style={{ height: `${(data.income / maxChartAmount) * 100}%` }}
                  />
                )}
                <div
                  className="w-8 bg-[#C0554F] rounded-t"
                  style={{ height: `${(data.expense / maxChartAmount) * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">{data.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>

    {filteredTransactions.length > 0 && (
      <>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-gray-900">Expenses by Category</h2>
          <div className="flex flex-col gap-3">
            {byCategory.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#3D6B4F]" />
                <span className="flex-1 text-sm text-gray-700">{c.name}</span>
                <div className="w-40 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-[#3D6B4F]" style={{ width: `${c.pct}%` }} />
                </div>
                <span className="w-10 text-right text-sm font-semibold text-gray-900">{c.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`grid grid-cols-1 ${view === 'personal' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
          <Stat
            label="Avg. daily spend"
            value={`$${(expenses / daysInRange).toFixed(2)}`}
            sub={`Based on ${getRangeLabel(range, referenceDate)}`}
          />
          <Stat
            label="Biggest expense"
            value={byCategory.length > 0 ? `${biggestExpense.name} $${biggestExpense.amount.toFixed(2)}` : "-"}
            sub={byCategory.length > 0 ? `${biggestExpense.pct}% of expenses` : ""}
          />
          {view === 'personal' && (
            <Stat
              label="Savings rate"
              value={`${income === 0 ? 0 : ((income - expenses) / income * 100).toFixed(1)}%`}
              sub="Income remaining after expenses"
            />
          )}
        </div>
      </>
    )}
  </>
)}
</Layout>

  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  )
}
