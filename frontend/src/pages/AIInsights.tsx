import Layout from '../components/Layout'

const insights = [
  {
    icon: '📈',
    title: 'Food spending is elevated',
    tag: '⚠ Attention',
    tagClass: 'bg-amber-50 text-amber-700',
    borderClass: 'border-l-4 border-l-amber-400',
    body: "You've spent $213 on food this month — 38% of total expenses. The student average is around 25%.",
    link: 'View food transactions →',
  },
  {
    icon: '💰',
    title: 'Savings are on track',
    tag: '✓ On track',
    tagClass: 'bg-green-50 text-green-700',
    borderClass: 'border-l-4 border-l-green-500',
    body: "You've saved $1,842 this month — 76.8% of income.",
    link: 'Set a savings goal →',
  },
  {
    icon: '📺',
    title: 'Review your subscriptions',
    tag: '💡 Tip',
    tagClass: 'bg-gray-100 text-gray-600',
    borderClass: 'border-l-4 border-l-gray-300',
    body: 'You have $47.97/month in recurring subscriptions. Cancelling unused ones could save $576/year.',
    link: 'Review recurring expenses →',
  },
]

export default function AIInsights() {
  return (
    <Layout
      title="AI Insights"
      headerActions={
        <button className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700">
          ↻ Refresh insights
        </button>
      }
    >
      <div className="bg-[#2D5240] rounded-2xl p-6 mb-6 text-white">
        <div className="text-xs uppercase tracking-wide text-white/60 mb-2">✦ AI Summary · May 2026</div>
        <div className="text-2xl font-bold mb-1">You spent 23% less than last month</div>
        <div className="text-white/70 text-sm">
          Your food budget improved — and your savings rate (76.8%) is well above the student average.
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {insights.map((i) => (
          <div key={i.title} className={`bg-white rounded-2xl border border-gray-100 p-5 ${i.borderClass}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2 font-semibold text-gray-900">
                <span>{i.icon}</span>
                {i.title}
              </div>
              <span className={`text-xs font-semibold rounded px-2 py-0.5 ${i.tagClass}`}>{i.tag}</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{i.body}</p>
            <a href="#" className="text-sm text-[#3D6B4F] font-medium hover:underline">
              {i.link}
            </a>
          </div>
        ))}
      </div>
    </Layout>
  )
}
