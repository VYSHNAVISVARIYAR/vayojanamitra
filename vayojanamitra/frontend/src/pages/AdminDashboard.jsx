import { useState, useEffect } from "react"
import api from "../services/api"

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [schemesRes, usersRes] = await Promise.all([
          api.get("/schemes/count"),
          api.get("/users/count").catch(() => ({ data: { total: 0 } }))
        ])
        setStats({
          totalSchemes: schemesRes.data.total || 0,
          byCategory: schemesRes.data.by_category || {},
          totalUsers: usersRes.data.total || 0,
        })
      } catch (err) {
        console.error("Admin stats error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const handleScrapeNow = async () => {
    try {
      await api.post("/admin/scrape-now")
      alert("Scraping started!")
    } catch (err) {
      alert("Scrape trigger failed")
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500 text-lg">Loading dashboard...</p>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-green-800 mb-6">
        🛠️ Admin Dashboard
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow p-5 text-center">
          <p className="text-4xl font-bold text-green-700">{stats?.totalSchemes}</p>
          <p className="text-gray-500 mt-1">Total Schemes</p>
        </div>
        <div className="bg-white rounded-xl shadow p-5 text-center">
          <p className="text-4xl font-bold text-blue-700">{stats?.totalUsers}</p>
          <p className="text-gray-500 mt-1">Total Users</p>
        </div>
        <div className="bg-white rounded-xl shadow p-5 text-center">
          <p className="text-4xl font-bold text-orange-600">
            {Object.keys(stats?.byCategory || {}).length}
          </p>
          <p className="text-gray-500 mt-1">Categories</p>
        </div>
        <div className="bg-white rounded-xl shadow p-5 text-center">
          <p className="text-4xl font-bold text-purple-600">2x</p>
          <p className="text-gray-500 mt-1">Daily Scrapes</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          📊 Schemes by Category
        </h2>
        <div className="space-y-3">
          {Object.entries(stats?.byCategory || {}).map(([cat, count]) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="w-28 text-sm capitalize text-gray-600">{cat}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-4">
                <div
                  className="bg-green-500 h-4 rounded-full transition-all"
                  style={{
                    width: `${Math.min((count / stats.totalSchemes) * 100, 100)}%` 
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700 w-8">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Actions */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          ⚡ Admin Actions
        </h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleScrapeNow}
            className="px-6 py-3 bg-green-700 text-white rounded-lg 
                       hover:bg-green-800 transition font-medium"
          >
            🔄 Trigger Scrape Now
          </button>
          <button
            onClick={() => api.post("/admin/run-proactive-agent")
              .then(() => alert("Proactive agent ran!"))
              .catch(() => alert("Failed"))
            }
            className="px-6 py-3 bg-blue-600 text-white rounded-lg 
                       hover:bg-blue-700 transition font-medium"
          >
            🤖 Run Proactive Agent
          </button>
        </div>
      </div>
    </div>
  )
}
