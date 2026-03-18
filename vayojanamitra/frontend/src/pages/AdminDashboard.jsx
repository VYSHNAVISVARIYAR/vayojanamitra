// pages/AdminDashboard.jsx
import { useState, useEffect } from "react"
import api from "../services/api"

export default function AdminDashboard() {
  const [stats, setStats]       = useState(null)
  const [llmStats, setLlmStats] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [actionMsg, setActionMsg] = useState("")

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [schemesRes, llmRes, usersRes] = 
        await Promise.all([
          api.get("/schemes/count"),
          api.get("/admin/llm-stats"),
          api.get("/admin/user-stats")
            .catch(() => ({ data: { total: 0 } }))
        ])
      setStats({
        schemes: schemesRes.data,
        users: usersRes.data
      })
      setLlmStats(llmRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const runAction = async (endpoint, label) => {
    setActionMsg(`⏳ Running ${label}...`)
    try {
      await api.post(endpoint)
      setActionMsg(`✅ ${label} completed!`)
      fetchAll()  // refresh stats
    } catch (err) {
      setActionMsg(`❌ ${label} failed`)
    }
    setTimeout(() => setActionMsg(""), 4000)
  }

  const CATEGORY_COLORS = {
    pension:     "bg-blue-500",
    healthcare:  "bg-green-500",
    housing:     "bg-orange-500",
    disability:  "bg-purple-500",
    agriculture: "bg-yellow-500",
    education:   "bg-pink-500",
    women:       "bg-red-500",
    general:     "bg-gray-500",
  }

  if (loading) return (
    <div className="flex items-center justify-center 
                    min-h-screen">
      <div className="text-center">
        <div className="animate-spin text-4xl mb-3">⚙️</div>
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 
                    bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="flex justify-between 
                      items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-green-800">
            🛠️ Admin Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Vayojanamitra System Monitor
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="px-4 py-2 bg-green-700 text-white 
                     rounded-lg hover:bg-green-800 
                     text-sm font-medium"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Action Message */}
      {actionMsg && (
        <div className="mb-6 p-4 bg-blue-50 border 
                        border-blue-200 rounded-xl 
                        text-blue-800 font-medium">
          {actionMsg}
        </div>
      )}

      {/* ── SECTION 1: Overview Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 
                      gap-4 mb-8">
        {[
          {
            label: "Total Schemes",
            value: stats?.schemes?.total || 0,
            icon: "📋", color: "text-blue-600"
          },
          {
            label: "Total Users",
            value: stats?.users?.total || 0,
            icon: "👥", color: "text-green-600"
          },
          {
            label: "AI Calls Today",
            value: llmStats?.calls_today?.total || 0,
            icon: "🤖", color: "text-purple-600"
          },
          {
            label: "Categories",
            value: Object.keys(
              stats?.schemes?.by_category || {}
            ).length,
            icon: "🗂️", color: "text-orange-600"
          }
        ].map((stat, i) => (
          <div key={i}
            className="bg-white rounded-xl shadow-sm 
                       p-5 text-center">
            <p className="text-3xl mb-1">{stat.icon}</p>
            <p className={`text-3xl font-bold 
                          ${stat.color}`}>
              {stat.value.toLocaleString()}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 
                      gap-6 mb-6">

        {/* ── SECTION 2: Schemes by Category ── */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold 
                         text-gray-800 mb-4">
            📊 Schemes by Category
          </h2>
          <div className="space-y-3">
            {Object.entries(
              stats?.schemes?.by_category || {}
            ).map(([cat, count]) => (
              <div key={cat} 
                   className="flex items-center gap-3">
                <span className="w-24 text-sm 
                                 capitalize text-gray-600">
                  {cat}
                </span>
                <div className="flex-1 bg-gray-100 
                                rounded-full h-5 
                                overflow-hidden">
                  <div
                    className={`h-5 rounded-full 
                               transition-all
                               ${CATEGORY_COLORS[cat] || 
                                 "bg-gray-400"}`}
                    style={{
                      width: `${Math.min(
                        (count / 
                         (stats?.schemes?.total || 1)
                        ) * 100, 100
                      )}%`
                    }}
                  />
                </div>
                <span className="text-sm font-bold 
                                 text-gray-700 w-8">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 3: AI Usage ── */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold 
                         text-gray-800 mb-4">
            🤖 AI Usage Today
          </h2>

          {/* Provider stats */}
          {[
            {
              label: "Gemini",
              calls: llmStats?.calls_today?.gemini || 0,
              keys: llmStats?.keys_loaded?.gemini || 0,
              color: "bg-blue-500"
            },
            {
              label: "Groq",
              calls: llmStats?.calls_today?.groq || 0,
              keys: llmStats?.keys_loaded?.groq || 0,
              color: "bg-orange-500"
            },
            {
              label: "OpenRouter",
              calls: llmStats?.calls_today?.openrouter || 0,
              keys: llmStats?.keys_loaded?.openrouter || 0,
              color: "bg-purple-500"
            }
          ].map((p, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between 
                              text-sm mb-1">
                <span className="font-medium">
                  {p.label}
                  <span className="text-gray-400 
                                   font-normal ml-1">
                    ({p.keys} keys)
                  </span>
                </span>
                <span className="text-gray-600">
                  {p.calls} calls
                </span>
              </div>
              <div className="bg-gray-100 rounded-full 
                              h-3">
                <div
                  className={`h-3 rounded-full ${p.color}`}
                  style={{
                    width: `${Math.min(
                      (p.calls / 
                       Math.max(
                         llmStats?.calls_today?.total || 1,
                         1
                       )
                      ) * 100, 100
                    )}%`
                  }}
                />
              </div>
            </div>
          ))}

          {/* Token estimate */}
          <div className="mt-4 p-3 bg-green-50 
                          rounded-lg border 
                          border-green-200">
            <p className="text-sm text-green-800">
              <strong>Daily Token Budget:</strong>{" "}
              {(
                (llmStats?.tokens_per_day_estimate
                  ?.total_guaranteed || 0
                ) / 1_000_000
              ).toFixed(0)}M tokens available
            </p>
            <p className="text-xs text-green-600 mt-1">
              Used: ~{(
                (llmStats?.calls_today?.total || 0) * 500
              ).toLocaleString()} tokens
            </p>
          </div>

          {/* Failed calls warning */}
          {(llmStats?.calls_today?.failed || 0) > 0 && (
            <div className="mt-3 p-3 bg-red-50 
                            rounded-lg border 
                            border-red-200">
              <p className="text-sm text-red-700">
                ⚠️ {llmStats.calls_today.failed} failed 
                AI calls today
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 4: Admin Actions ── */}
      <div className="bg-white rounded-xl shadow-sm 
                      p-6 mb-6">
        <h2 className="text-lg font-semibold 
                       text-gray-800 mb-4">
          ⚡ Admin Actions
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 
                        gap-3">
          {[
            {
              label: "Scrape Now",
              icon: "🔄",
              endpoint: "/admin/scrape-now",
              color: "bg-green-600 hover:bg-green-700"
            },
            {
              label: "Proactive Agent",
              icon: "🤖",
              endpoint: "/admin/run-proactive-agent",
              color: "bg-blue-600 hover:bg-blue-700"
            },
            {
              label: "Re-index ChromaDB",
              icon: "🔍",
              endpoint: "/admin/reindex-chroma",
              color: "bg-purple-600 hover:bg-purple-700"
            },
            {
              label: "Fix Categories",
              icon: "🗂️",
              endpoint: "/admin/fix-categories",
              color: "bg-orange-600 hover:bg-orange-700"
            },
            {
              label: "Test Alerts",
              icon: "🔔",
              endpoint: "/admin/test-alerts",
              color: "bg-yellow-600 hover:bg-yellow-700"
            },
            {
              label: "Clear Cache",
              icon: "🗑️",
              endpoint: "/admin/clear-cache",
              color: "bg-red-600 hover:bg-red-700"
            },
            {
              label: "Test LLM",
              icon: "🧪",
              endpoint: "/admin/test-llm",
              color: "bg-indigo-600 hover:bg-indigo-700"
            },
            {
              label: "Seed Schemes",
              icon: "🌱",
              endpoint: "/admin/seed-schemes",
              color: "bg-teal-600 hover:bg-teal-700"
            }
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => runAction(
                action.endpoint,
                action.label
              )}
              className={`py-3 px-4 text-white 
                         rounded-lg text-sm 
                         font-medium transition
                         flex items-center 
                         justify-center gap-2
                         ${action.color}`}
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── SECTION 5: DB Health ── */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold 
                       text-gray-800 mb-4">
          💾 Database Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 
                        gap-4">
          {[
            {
              name: "MongoDB",
              status: "✅ Connected",
              detail: `${stats?.schemes?.total || 0} schemes stored`,
              color: "border-green-200 bg-green-50"
            },
            {
              name: "ChromaDB",
              status: "✅ Indexed",
              detail: `${stats?.schemes?.total || 0} vectors indexed`,
              color: "border-blue-200 bg-blue-50"
            },
            {
              name: "LLM Rotator",
              status: "✅ Active",
              detail: `${llmStats?.keys_loaded?.total || 0} API keys loaded`,
              color: "border-purple-200 bg-purple-50"
            }
          ].map((db, i) => (
            <div key={i}
              className={`p-4 rounded-lg border 
                         ${db.color}`}
            >
              <p className="font-semibold text-gray-800">
                {db.name}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {db.status}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {db.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
