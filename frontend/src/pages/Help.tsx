import Layout from '../components/Layout'

const topics = [
  'How Smart Scan reads your receipts',
  'Setting up a recurring transaction',
  'Splitting group expenses evenly or custom',
  'Contact support',
]

export default function Help() {
  return (
    <Layout title="Help & Support">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Search help articles</h2>
        <div className="relative">
          <input
            placeholder="e.g. how do I split a group expense?"
            className="w-full h-11 border border-gray-200 rounded-xl pl-9 pr-3 text-sm outline-none focus:border-[#3D6B4F]"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Popular topics</h2>
        <div className="flex flex-col gap-2">
          {topics.map((t) => (
            <a key={t} href="#" className="text-sm text-[#3D6B4F] font-medium hover:underline">
              → {t}
            </a>
          ))}
        </div>
      </div>
    </Layout>
  )
}
