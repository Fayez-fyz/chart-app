

import { useState, useMemo, useRef } from "react"
import Globe from "react-globe.gl"
import ForceGraph2D from "react-force-graph-2d"
import { countryCoordinates, trainingData } from "../utils/GlobeData"
import FilterCard from "./filter-card"
import KPICard from "./kpi-card"


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
  const [, setHoveredPoint] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const graphRef = useRef()

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

  const networkData = useMemo(() => {
    if (!selectedCountry) return { nodes: [], links: [] }

    const countryRecords = filteredData.filter((r) => r.Country === selectedCountry)
    const nodes = []
    const links = []

    const countryMetric = countryMetrics.find((m) => m.country === selectedCountry)
    nodes.push({
      id: "country",
      name: selectedCountry,
      type: "country",
      val: 30,
      color: getColor(countryMetric.completionRate),
      info: {
        completion: countryMetric.completionRate.toFixed(1) + "%",
        associates: countryMetric.associatesCount,
        hours: countryMetric.totalHours.toFixed(1),
      },
    })

    const segments = {}
    const assignmentTypes = {}
    const themes = {}
    const statuses = {}
    const departments = {}

    countryRecords.forEach((record) => {
      const seg = record["Segment (updated)"]
      const assign = record["Assignment Type"]
      const theme = record.Theme
      const status = record["Item Status"]
      const dept = record["Department description"]

      if (!segments[seg]) segments[seg] = { count: 0, hours: 0, completed: 0, inScope: 0 }
      if (!assignmentTypes[assign]) assignmentTypes[assign] = { count: 0, hours: 0, completed: 0, inScope: 0 }
      if (!themes[theme]) themes[theme] = { count: 0, hours: 0, completed: 0, inScope: 0 }
      if (!statuses[status]) statuses[status] = { count: 0, hours: 0 }
      if (!departments[dept]) departments[dept] = { count: 0, hours: 0, completed: 0, inScope: 0 }

      segments[seg].count++
      segments[seg].hours += record["Training Hours"] || 0
      assignmentTypes[assign].count++
      assignmentTypes[assign].hours += record["Training Hours"] || 0
      themes[theme].count++
      themes[theme].hours += record["Training Hours"] || 0
      statuses[status].count++
      statuses[status].hours += record["Training Hours"] || 0
      departments[dept].count++
      departments[dept].hours += record["Training Hours"] || 0

      if (record["Course In Scope"] === "Yes") {
        segments[seg].inScope++
        assignmentTypes[assign].inScope++
        themes[theme].inScope++
        departments[dept].inScope++

        if (record["Item Status"] === "Completed") {
          segments[seg].completed++
          assignmentTypes[assign].completed++
          themes[theme].completed++
          departments[dept].completed++
        }
      }
    })

    Object.entries(segments).forEach(([name, data]) => {
      const nodeId = `segment-${name}`
      const completion = data.inScope > 0 ? (data.completed / data.inScope) * 100 : 0
      nodes.push({
        id: nodeId,
        name: name,
        type: "segment",
        val: 15,
        color: "#3b82f6",
        info: {
          type: "Segment",
          count: data.count,
          hours: data.hours.toFixed(1),
          completion: completion.toFixed(1) + "%",
        },
      })
      links.push({ source: "country", target: nodeId, color: "rgba(59, 130, 246, 0.3)" })
    })

    Object.entries(assignmentTypes).forEach(([name, data]) => {
      const nodeId = `assignment-${name}`
      const completion = data.inScope > 0 ? (data.completed / data.inScope) * 100 : 0
      nodes.push({
        id: nodeId,
        name: name,
        type: "assignment",
        val: 12,
        color: "#8b5cf6",
        info: {
          type: "Assignment",
          count: data.count,
          hours: data.hours.toFixed(1),
          completion: completion.toFixed(1) + "%",
        },
      })
      links.push({ source: "country", target: nodeId, color: "rgba(139, 92, 246, 0.3)" })
    })

    Object.entries(themes).forEach(([name, data]) => {
      const nodeId = `theme-${name}`
      const completion = data.inScope > 0 ? (data.completed / data.inScope) * 100 : 0
      nodes.push({
        id: nodeId,
        name: name,
        type: "theme",
        val: 12,
        color: "#06b6d4",
        info: {
          type: "Theme",
          count: data.count,
          hours: data.hours.toFixed(1),
          completion: completion.toFixed(1) + "%",
        },
      })
      links.push({ source: "country", target: nodeId, color: "rgba(6, 182, 212, 0.3)" })
    })

    Object.entries(statuses).forEach(([name, data]) => {
      const nodeId = `status-${name}`
      const statusColor = name === "Completed" ? "#10b981" : name === "In Progress" ? "#f59e0b" : "#ef4444"
      nodes.push({
        id: nodeId,
        name: name,
        type: "status",
        val: 10,
        color: statusColor,
        info: {
          type: "Status",
          count: data.count,
          hours: data.hours.toFixed(1),
        },
      })
      links.push({ source: "country", target: nodeId, color: statusColor + "33" })
    })

    Object.entries(departments).forEach(([name, data]) => {
      const nodeId = `dept-${name}`
      const completion = data.inScope > 0 ? (data.completed / data.inScope) * 100 : 0
      nodes.push({
        id: nodeId,
        name: name,
        type: "department",
        val: 10,
        color: "#ec4899",
        info: {
          type: "Department",
          count: data.count,
          hours: data.hours.toFixed(1),
          completion: completion.toFixed(1) + "%",
        },
      })
      links.push({ source: "country", target: nodeId, color: "rgba(236, 72, 153, 0.3)" })
    })

    return { nodes, links }
  }, [selectedCountry, filteredData, countryMetrics])

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 text-white flex flex-col">
      {/* Header Section */}
      <div className="border-b border-slate-700/50 bg-gradient-to-r from-slate-900/80 via-slate-800/50 to-slate-900/80 backdrop-blur-sm">
        <div className="px-8 py-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent mb-2">
            Training Analytics Dashboard
          </h1>
          {/* <p className="text-slate-400 text-sm">Global training metrics and performance insights</p> */}
        </div>
      </div>

      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm px-8 py-3">
        <div className="flex flex-wrap gap-4">
          <FilterCard
            label="Regions"
            value={filters.region}
            onChange={(val) => setFilters({ ...filters, region: val })}
            options={filterOptions.regions}
            icon="🌍"
          />
          <FilterCard
            label="Countries"
            value={filters.country}
            onChange={(val) => setFilters({ ...filters, country: val })}
            options={filterOptions.countries}
            icon="🏙️"
          />
          <FilterCard
            label="Segments"
            value={filters.segment}
            onChange={(val) => setFilters({ ...filters, segment: val })}
            options={filterOptions.segments}
            icon="📊"
          />
          <FilterCard
            label="Job Functions"
            value={filters.jobFunction}
            onChange={(val) => setFilters({ ...filters, jobFunction: val })}
            options={filterOptions.jobFunctions}
            icon="💼"
          />
          <FilterCard
            label="Managers"
            value={filters.manager}
            onChange={(val) => setFilters({ ...filters, manager: val })}
            options={filterOptions.managers}
            icon="👤"
          />
          <FilterCard
            label="Assignment Types"
            value={filters.assignmentType}
            onChange={(val) => setFilters({ ...filters, assignmentType: val })}
            options={filterOptions.assignmentTypes}
            icon="📋"
          />
          <FilterCard
            label="Themes"
            value={filters.theme}
            onChange={(val) => setFilters({ ...filters, theme: val })}
            options={filterOptions.themes}
            icon="🎨"
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden">
        {/* Left Panel - Globe */}
        <div className="w-full lg:w-1/2 flex flex-col min-h-0 bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-900/40 rounded-2xl overflow-hidden border border-slate-700/30 shadow-2xl">
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
                <div style="background: rgba(15, 23, 42, 0.95); padding: 12px; border-radius: 12px; color: white; font-size: 12px; border: 1px solid rgba(100, 116, 139, 0.5);">
                  <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #60a5fa;">${d.country}</div>
                  <div style="color: #cbd5e1;"><strong>Region:</strong> ${d.region}</div>
                  <div style="color: #cbd5e1;"><strong>Associates:</strong> ${d.associatesCount}</div>
                  <div style="color: #10b981;"><strong>Completion:</strong> ${d.completionRate.toFixed(1)}%</div>
                  <div style="color: #cbd5e1;"><strong>Total Hours:</strong> ${d.totalHours.toFixed(1)}</div>
                </div>
              `}
              onPointClick={(point) => setSelectedCountry(point.country)}
              onPointHover={setHoveredPoint}
            />

            <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm p-4 rounded-xl text-xs border border-slate-700/50 shadow-xl">
              <div className="font-bold mb-3 text-slate-200">Completion Rate</div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
                  <span className="text-slate-300">≥ 60%</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50"></div>
                  <span className="text-slate-300">50-60%</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50"></div>
                  <span className="text-slate-300">&lt; 50%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - KPIs and Network Graph */}
        <div className="w-full lg:w-1/2  min-h-0 bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-900/40 rounded-2xl p-4 overflow-y-auto border border-slate-700/30 shadow-2xl">
          <div className="space-y-4 mb-6 flex gap-4">
            <KPICard
              title="Completion Rate"
              value={kpis.completionRate.toFixed(1)}
              unit="%"
              gradient="from-blue-600 via-blue-500 to-cyan-500 "
              icon="✓"
            //   trend="+5.2%"
            />

            <KPICard
              title="Avg Hours per Associate"
              value={kpis.avgHours.toFixed(1)}
              unit="hrs"
              gradient="from-purple-600 via-purple-500 to-pink-500"
              icon="⏱️"
            //   trend="+2.1%"
            />

            <KPICard
              title="Total Associates"
              value={kpis.totalAssociates}
              unit="people"
              gradient="from-emerald-600 via-emerald-500 to-teal-500"
              icon="👥"
            //   trend="+12"
            />
          </div>

          {/* Network Graph Section - Unchanged */}
          {selectedCountry ? (
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-100">{selectedCountry} Analytics Network</h2>
                <button
                  onClick={() => setSelectedCountry(null)}
                  className="text-slate-400 hover:text-slate-200 transition-colors text-2xl font-light"
                >
                  ✕
                </button>
              </div>

              <div
                className="bg-slate-900/50 rounded-xl overflow-hidden relative flex-1 border border-slate-700/30"
                style={{ minHeight: "200px" }}
              >
                <ForceGraph2D
                  ref={graphRef}
                  graphData={networkData}
                  nodeLabel=""
                  nodeCanvasObject={(node, ctx) => {
                    const label = node.name
                    const fontSize = node.type === "country" ? 14 : 10
                    ctx.font = `${fontSize}px Sans-Serif`

                    ctx.beginPath()
                    ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false)
                    ctx.fillStyle = node.color
                    ctx.fill()

                    if (hoveredNode && hoveredNode.id === node.id) {
                      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"
                      ctx.lineWidth = 3
                      ctx.stroke()
                    }

                    ctx.textAlign = "center"
                    ctx.textBaseline = "middle"
                    ctx.fillStyle = "white"
                    ctx.fillText(label, node.x, node.y)

                    if (hoveredNode && hoveredNode.id === node.id && node.info) {
                      const padding = 8
                      const lineHeight = 14
                      const infoLines = Object.entries(node.info).map(([key, val]) => `${key}: ${val}`)
                      const maxWidth = Math.max(...infoLines.map((line) => ctx.measureText(line).width))
                      const boxWidth = maxWidth + padding * 2
                      const boxHeight = infoLines.length * lineHeight + padding * 2

                      const boxX = node.x - boxWidth / 2
                      const boxY = node.y + node.val + 10

                      ctx.fillStyle = "rgba(15, 23, 42, 0.95)"
                      ctx.fillRect(boxX, boxY, boxWidth, boxHeight)

                      ctx.strokeStyle = node.color
                      ctx.lineWidth = 2
                      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)

                      ctx.fillStyle = "white"
                      ctx.font = "11px Sans-Serif"
                      ctx.textAlign = "left"
                      infoLines.forEach((line, i) => {
                        ctx.fillText(line, boxX + padding, boxY + padding + i * lineHeight + lineHeight / 2)
                      })
                    }
                  }}
                  nodePointerAreaPaint={(node, color, ctx) => {
                    ctx.fillStyle = color
                    ctx.beginPath()
                    ctx.arc(node.x, node.y, node.val * 1.5, 0, 2 * Math.PI, false)
                    ctx.fill()
                  }}
                  linkColor="color"
                  linkWidth={2}
                  linkDirectionalParticles={2}
                  linkDirectionalParticleWidth={2}
                  linkDirectionalParticleSpeed={0.005}
                  backgroundColor="#111827"
                  onNodeHover={setHoveredNode}
                  cooldownTicks={100}
                  d3AlphaDecay={0.02}
                  height={400}
                  width={600}
                  d3VelocityDecay={0.3}
                />
              </div>

              {/* Legend for network */}
              <div className="mt-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                <div className="font-bold mb-3 text-sm text-slate-200">Node Categories</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-slate-300">Segments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-slate-300">Assignment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                    <span className="text-slate-300">Themes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                    <span className="text-slate-300">Departments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-slate-300">Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-slate-300">In Progress</span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-400">Hover over nodes to see detailed information.</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center flex-1 text-center text-slate-400">
              <div>
                <svg
                  className="w-16 h-16 mx-auto mb-4 opacity-40 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-lg font-medium mb-2 text-slate-300">Select a Country</p>
                <p className="text-sm text-slate-400">Click on any point on the globe to view network analytics</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TrainingGlobeDashboard
