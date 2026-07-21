import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { categories } from '../data/mockData'

const steps = [
  { n: 1, title: 'Upload', sub: 'Photo or PDF of your receipt' },
  { n: 2, title: 'Text is extracted', sub: 'Amount, date, merchant auto-filled' },
  { n: 3, title: 'Review & save', sub: 'Correct anything and confirm' },
]

function StepBar({ current }: { current: number }) {
  return (
    <div className="bg-[#EDF4EE] rounded-xl p-4 flex flex-wrap gap-6 mb-6">
      {steps.map((s) => (
        <div key={s.n} className="flex items-center gap-3">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ${
              s.n <= current ? 'bg-[#2D5240]' : 'bg-gray-300'
            }`}
          >
            {s.n}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">{s.title}</div>
            <div className="text-xs text-gray-500">{s.sub}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SmartScan() {
  const [uploaded, setUploaded] = useState(false)

  if (uploaded) return <ReceiptReview onBack={() => setUploaded(false)} />

  return (
    <Layout title="Smart Scan">
      <div className="text-sm text-gray-400 mb-4">
        <Link to="/transactions" className="hover:underline">
          ← Transactions
        </Link>{' '}
        / <span className="text-gray-700 font-medium">Smart Scan</span>
      </div>

      <StepBar current={1} />

      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Upload a receipt or invoice</h2>
        <p className="text-sm text-gray-500 mb-6">
          Take a photo of a store receipt, or upload a saved invoice.
          <br />
          We'll read the text automatically — you just review and save.
        </p>
        <div
          onClick={() => setUploaded(true)}
          className="border-2 border-dashed border-gray-200 rounded-xl py-14 mb-6 cursor-pointer hover:border-[#3D6B4F] transition"
        >
          <div className="text-3xl mb-2">↑</div>
          <div className="font-semibold text-gray-900">Drag & drop your file here</div>
          <div className="text-sm text-gray-400">or click to browse</div>
        </div>
        <button
          onClick={() => setUploaded(true)}
          className="h-11 px-6 rounded-xl bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240] mb-4"
        >
          Choose file to upload
        </button>
        <div className="text-sm text-gray-400 mb-4">or</div>
        <button className="h-11 px-6 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 mb-4">
          + Add transaction manually
        </button>
        <div className="text-xs text-gray-400">Supports JPG, PNG, HEIC, PDF · Max 10 MB</div>
      </div>
    </Layout>
  )
}

function ReceiptReview({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate()
  const [kind, setKind] = useState<'Expense' | 'Income'>('Expense')
  const [category, setCategory] = useState('Grocery')

  return (
    <Layout title="Receipt Information">
      <div className="text-sm text-gray-400 mb-4">
        <button onClick={onBack} className="hover:underline">
          ← Re-upload
        </button>{' '}
        / <span className="text-gray-700 font-medium">Receipt Information</span>
      </div>

      <div className="bg-green-50 border border-green-200 text-green-900 rounded-xl px-4 py-3 text-sm mb-6">
        <span className="font-semibold">✓ Extracted — please review before saving.</span> 5 of 6 fields detected with
        high confidence. Check the highlighted field and correct anything that looks wrong.
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-900">Uploaded receipt</h2>
          <span className="text-xs font-semibold text-green-700">✓ Scan complete</span>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 font-mono text-xs text-gray-600 leading-relaxed">
          <div className="text-center font-bold">SUPERSTORE</div>
          <div className="text-center mb-2">5880 Spring Garden Rd, Halifax, NS B3H 1Y1</div>
          <div className="border-t border-dashed border-gray-300 my-2" />
          <div className="flex justify-between"><span>Bread (WW)</span><span>$3.49</span></div>
          <div className="flex justify-between"><span>Milk 2% 4L</span><span>$6.99</span></div>
          <div className="flex justify-between"><span>Chicken breast</span><span>$14.27</span></div>
          <div className="flex justify-between"><span>Pasta 500g x2</span><span>$4.98</span></div>
          <div className="flex justify-between"><span>Tomato sauce</span><span>$3.29</span></div>
          <div className="flex justify-between"><span>Apples 3lb bag</span><span>$5.49</span></div>
          <div className="flex justify-between"><span>Orange juice</span><span>$4.79</span></div>
          <div className="border-t border-dashed border-gray-300 my-2" />
          <div className="flex justify-between"><span>Subtotal</span><span>$43.30</span></div>
          <div className="flex justify-between"><span>HST (15%)</span><span>$6.50</span></div>
          <div className="flex justify-between font-bold"><span>TOTAL</span><span>$49.80</span></div>
          <div className="mt-2">VISA ····4821 &nbsp; $49.80</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="font-semibold text-gray-900">Extracted transaction details</h2>
          <span className="flex items-center gap-1 text-xs text-green-700">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> High confidence
          </span>
          <span className="flex items-center gap-1 text-xs text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Review suggested
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5 max-w-sm">
          <button
            onClick={() => setKind('Expense')}
            className={`h-10 rounded-xl text-sm font-semibold border ${
              kind === 'Expense' ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-500'
            }`}
          >
            ▾ Expense
          </button>
          <button
            onClick={() => setKind('Income')}
            className={`h-10 rounded-xl text-sm font-semibold border ${
              kind === 'Income' ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-500'
            }`}
          >
            ▴ Income
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Field label="Amount"><input defaultValue="$49.80" className="input" /></Field>
          <Field label="Date"><input defaultValue="May 5, 2026" className="input" /></Field>
        </div>
        <Field label="Merchant"><input defaultValue="Superstore" className="input" /></Field>
        <div className="mb-4">
          <label className="label">Description</label>
          <input defaultValue="Superstore groceries — Halifax Spring Garden" className="input border-amber-300 bg-amber-50" />
        </div>
        <Field label="Tax amount (HST)"><input defaultValue="$6.50" className="input" /></Field>

        <div className="mb-5">
          <label className="label">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.name}
                onClick={() => setCategory(c.name)}
                className={`px-3 py-2 rounded-xl border text-sm flex flex-col items-center gap-1 min-w-[64px] ${
                  category === c.name ? 'border-[#3D6B4F] bg-[#EDF4EE] text-[#2D5240]' : 'border-gray-200 text-gray-600'
                }`}
              >
                <span>{c.icon}</span>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-3 border-t border-gray-100 mb-5">
          <div>
            <div className="text-sm font-medium text-gray-900">Mark as recurring</div>
            <div className="text-xs text-gray-400">Auto-add this transaction — choose how often</div>
          </div>
          <div className="w-11 h-6 rounded-full bg-gray-200 relative">
            <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow" />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onBack} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => navigate('/transactions')}
            className="flex-1 h-11 rounded-xl bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240]"
          >
            ✓ Save transaction
          </button>
        </div>
      </div>

      <style>{`
        .input { width:100%; height:44px; border:1px solid #e5e7eb; border-radius:0.75rem; padding:0 14px; font-size:0.875rem; outline:none; }
        .input:focus { border-color:#3D6B4F; }
        .label { display:block; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.03em; margin-bottom:6px; }
      `}</style>
    </Layout>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="label">{label}</label>
      {children}
    </div>
  )
}
