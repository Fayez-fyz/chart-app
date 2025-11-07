"use client"

import { useState, useMemo } from "react"
import Globe from "react-globe.gl"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts"
import { countryCoordinates, trainingData } from "../utils/GlobeData"

// Training data with generated coordinates


const TrainingGlobeDashboard = () => {
  const [filters, setFilters] = useState({
    dateRange: "all",
    region: "all",
    country: "all",
    segment: "all",
    manager: "all",
    jobFunction: "all",
    assignmentType: "all",
    theme: "all",
  })

  const [selectedCountry, setSelectedCountry] = useState(null)
  const [hoveredPoint, setHoveredPoint] = useState(null)

  const filteredData = useMemo(() => {
    return trainingData.filter((record) => {
      if (filters.region !== "all" && record.Region !== filters.region) return false
      if (filters.country !== "all" && record.Country !== filters.country) return false
      if (filters.segment !== "all" && record["Segment (updated)"] !== filters.segment) return false
      if (filters.manager !== "all" && record["Manager Full Name"] !== filters.manager) return false
      if (filters.jobFunction !== "all" && record["Job Function"] !== filters.jobFunction) return false
      if (filters.assignmentType !== "all" && record["Assignment Type"] !== filters.assignmentType) return false
      if (filters.theme !== "all" && record.Theme !== filters.theme) return false
      return true
    })
  }, [filters])

  const countryMetrics = useMemo(() => {
    const metrics = {}

    filteredData.forEach((record) => {
      const country = record.Country
      if (!metrics[country]) {
        metrics[country] = {
          country,
          region: record.Region,
          associates: new Set(),
          totalHours: 0,
          inScopeCourses: 0,
          completedCourses: 0,
          records: [],
        }
      }

      metrics[country].associates.add(record["Associate ID"])
      metrics[country].totalHours += record["Training Hours"] || 0
      metrics[country].records.push(record)

      if (record["Course In Scope"] === "Yes") {
        metrics[country].inScopeCourses++
        if (record["Item Status"] === "Completed") {
          metrics[country].completedCourses++
        }
      }
    })

    return Object.values(metrics).map((m) => ({
      ...m,
      associatesCount: m.associates.size,
      completionRate: m.inScopeCourses > 0 ? (m.completedCourses / m.inScopeCourses) * 100 : 0,
      avgHoursPerAssociate: m.associates.size > 0 ? m.totalHours / m.associates.size : 0,
      ...countryCoordinates[m.country],
    }))
  }, [filteredData])

  const kpis = useMemo(() => {
    const uniqueAssociates = new Set(filteredData.map((r) => r["Associate ID"]))
    const totalHours = filteredData.reduce((sum, r) => sum + (r["Training Hours"] || 0), 0)
    const inScope = filteredData.filter((r) => r["Course In Scope"] === "Yes")
    const completed = inScope.filter((r) => r["Item Status"] === "Completed")

    return {
      completionRate: inScope.length > 0 ? (completed.length / inScope.length) * 100 : 0,
      avgHours: uniqueAssociates.size > 0 ? totalHours / uniqueAssociates.size : 0,
      totalAssociates: uniqueAssociates.size,
    }
  }, [filteredData])

  const getColor = (rate) => {
    if (rate >= 60) return "#10b981"
    if (rate >= 50) return "#f59e0b"
    return "#ef4444"
  }

  const globePoints = countryMetrics.map((m) => ({
    lat: m.lat,
    lng: m.lng,
    size: Math.max(m.totalHours * 0.3, 0.5),
    color: getColor(m.completionRate),
    country: m.country,
    region: m.region,
    associatesCount: m.associatesCount,
    completionRate: m.completionRate,
    totalHours: m.totalHours,
    records: m.records,
  }))

  const selectedCountryData = useMemo(() => {
    if (!selectedCountry) return null

    const countryRecords = filteredData.filter((r) => r.Country === selectedCountry)

    const segmentData = {}
    countryRecords.forEach((r) => {
      const seg = r["Segment (updated)"]
      if (!segmentData[seg]) {
        segmentData[seg] = { inScope: 0, completed: 0 }
      }
      if (r["Course In Scope"] === "Yes") {
        segmentData[seg].inScope++
        if (r["Item Status"] === "Completed") {
          segmentData[seg].completed++
        }
      }
    })

    const segmentChart = Object.entries(segmentData).map(([name, data]) => ({
      name,
      completion: data.inScope > 0 ? ((data.completed / data.inScope) * 100).toFixed(1) : 0,
    }))

    const assignmentData = {}
    countryRecords.forEach((r) => {
      const type = r["Assignment Type"]
      if (!assignmentData[type]) {
        assignmentData[type] = { inScope: 0, completed: 0 }
      }
      if (r["Course In Scope"] === "Yes") {
        assignmentData[type].inScope++
        if (r["Item Status"] === "Completed") {
          assignmentData[type].completed++
        }
      }
    })

    const assignmentChart = Object.entries(assignmentData).map(([name, data]) => ({
      name,
      completion: data.inScope > 0 ? ((data.completed / data.inScope) * 100).toFixed(1) : 0,
    }))

    const statusCount = { Completed: 0, "In Progress": 0, Overdue: 0 }
    countryRecords.forEach((r) => {
      if (statusCount[r["Item Status"]] !== undefined) {
        statusCount[r["Item Status"]]++
      }
    })

    const courseStatus = Object.entries(statusCount).map(([name, value]) => ({
      name,
      value,
    }))

    return { segmentChart, assignmentChart, courseStatus }
  }, [selectedCountry, filteredData])

  const filterOptions = useMemo(
    () => ({
      regions: [...new Set(trainingData.map((r) => r.Region))],
      countries: [...new Set(trainingData.map((r) => r.Country))],
      segments: [...new Set(trainingData.map((r) => r["Segment (updated)"]))],
      managers: [...new Set(trainingData.map((r) => r["Manager Full Name"]))],
      jobFunctions: [...new Set(trainingData.map((r) => r["Job Function"]))],
      assignmentTypes: [...new Set(trainingData.map((r) => r["Assignment Type"]))],
      themes: [...new Set(trainingData.map((r) => r.Theme))],
    }),
    [],
  )

  const COLORS = ["#10b981", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6"]

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="border-b border-gray-700">
        <div className="px-6 py-4">
          <h1 className="text-3xl font-bold mb-4">Training Analytics Dashboard</h1>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <select
                value={filters.region}
                onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                className="bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 hover:border-gray-500 transition"
              >
                <option value="all">All Regions</option>
                {filterOptions.regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <select
                value={filters.country}
                onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                className="bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 hover:border-gray-500 transition"
              >
                <option value="all">All Countries</option>
                {filterOptions.countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={filters.segment}
                onChange={(e) => setFilters({ ...filters, segment: e.target.value })}
                className="bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 hover:border-gray-500 transition"
              >
                <option value="all">All Segments</option>
                {filterOptions.segments.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={filters.jobFunction}
                onChange={(e) => setFilters({ ...filters, jobFunction: e.target.value })}
                className="bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 hover:border-gray-500 transition"
              >
                <option value="all">All Job Functions</option>
                {filterOptions.jobFunctions.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>

              <select
                value={filters.manager}
                onChange={(e) => setFilters({ ...filters, manager: e.target.value })}
                className="bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 hover:border-gray-500 transition"
              >
                <option value="all">All Managers</option>
                {filterOptions.managers.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={filters.assignmentType}
                onChange={(e) => setFilters({ ...filters, assignmentType: e.target.value })}
                className="bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 hover:border-gray-500 transition"
              >
                <option value="all">All Assignment Types</option>
                {filterOptions.assignmentTypes.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>

              <select
                value={filters.theme}
                onChange={(e) => setFilters({ ...filters, theme: e.target.value })}
                className="bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 hover:border-gray-500 transition"
              >
                <option value="all">All Themes</option>
                {filterOptions.themes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden">
        {/* Left Panel - Globe */}
        <div className="w-full lg:w-1/2 flex flex-col min-h-0 bg-gray-800 rounded-lg overflow-hidden">
          <div className="flex-1 relative w-full h-full">
            <Globe
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
              backgroundImageUrl={"//unpkg.com/three-globe/example/img/night-sky.png"}
              pointsData={globePoints}
              pointLat="lat"
              pointLng="lng"
              pointColor="color"
              pointAltitude={0.01}
              width={910}
              height={800}
              pointRadius={(d) => d.totalHours}
              pointLabel={(d) => `
                <div style="background: rgba(0,0,0,0.9); padding: 12px; border-radius: 8px; color: white; font-size: 12px;">
                  <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">${d.country}</div>
                  <div><strong>Region:</strong> ${d.region}</div>
                  <div><strong>Associates:</strong> ${d.associatesCount}</div>
                  <div><strong>Completion:</strong> ${d.completionRate.toFixed(1)}%</div>
                  <div><strong>Total Hours:</strong> ${d.totalHours.toFixed(1)}</div>
                </div>
              `}
              onPointClick={(point) => setSelectedCountry(point.country)}
              onPointHover={setHoveredPoint}
            />

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-90 p-3 rounded-lg text-xs">
              <div className="font-bold mb-2">Completion Rate</div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span>≥ 60%</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                <span>50-60%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span>&lt; 50%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - KPIs and Details */}
        <div className="w-full lg:w-1/2 flex flex-col min-h-0 bg-gray-800 rounded-lg p-6 overflow-y-auto">
          {/* KPI Cards */}
          <div className="space-y-3 mb-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-4">
              <div className="text-sm opacity-90">Completion %</div>
              <div className="text-3xl font-bold mt-1">{kpis.completionRate.toFixed(1)}%</div>
            </div>

            <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-4">
              <div className="text-sm opacity-90">Avg Hours per Associate</div>
              <div className="text-3xl font-bold mt-1">{kpis.avgHours.toFixed(1)}</div>
            </div>

            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-4">
              <div className="text-sm opacity-90">Total Associates</div>
              <div className="text-3xl font-bold mt-1">{kpis.totalAssociates}</div>
            </div>
          </div>

          {/* Country Details Section */}
          {selectedCountry ? (
            <div className="space-y-4 flex-1 overflow-y-auto">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{selectedCountry}</h2>
                <button onClick={() => setSelectedCountry(null)} className="text-gray-400 hover:text-white text-lg">
                  ✕
                </button>
              </div>

              {/* Completion by Segment */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Completion % by Segment</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={selectedCountryData.segmentChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px" }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Bar dataKey="completion" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Completion by Assignment Type */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Completion % by Assignment Type</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={selectedCountryData.assignmentChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px" }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Bar dataKey="completion" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Course Status */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Course Status Distribution</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={selectedCountryData.courseStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {selectedCountryData.courseStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center flex-1 text-center text-gray-400">
              <div>
                <svg
                  className="w-16 h-16 mx-auto mb-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 104 0 2 2 0 012-2h1.064M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-lg font-medium mb-2">Select a Country</p>
                <p className="text-sm">Click on any point on the globe to view detailed analytics</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TrainingGlobeDashboard
