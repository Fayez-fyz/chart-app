import { useState, useMemo, useRef } from "react"
import Globe from "react-globe.gl"
import ForceGraph3D from "react-force-graph-3d"
import * as THREE from "three"
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
  const [selectedNode, setSelectedNode] = useState(null)
  const [expandedNodes, setExpandedNodes] = useState(new Set())
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

  const getSciFiColor = (level, completionRate) => {
    const colors = {
      0: "#00f0ff", // Cyan - Region
      1: "#7c3aed", // Purple - Country
      2: "#ec4899", // Pink - Segment
      3: "#f59e0b", // Amber - Job Function
      4: "#06b6d4", // Teal - Assignment Type
      5: completionRate >= 60 ? "#10b981" : completionRate >= 50 ? "#fbbf24" : "#ef4444", // Green/Yellow/Red - Course
    }
    return colors[level] || "#60a5fa"
  }

  const globePoints = countryMetrics.map((m) => ({
    lat: m.lat,
    lng: m.lng,
    size: Math.max(m.totalHours * 0.3, 0.5),
    color: m.completionRate >= 60 ? "#10b981" : m.completionRate >= 50 ? "#f59e0b" : "#ef4444",
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
    const allNodes = []
    const allLinks = []

    const countryMetric = countryMetrics.find((m) => m.country === selectedCountry)
    const countryNode = {
      id: "country",
      name: selectedCountry,
      type: "country",
      level: 1,
      color: getSciFiColor(1, countryMetric.completionRate),
      size: 20,
      hasChildren: true,
      info: {
        type: "Country",
        completion: countryMetric.completionRate.toFixed(1) + "%",
        associates: countryMetric.associatesCount,
        totalHours: countryMetric.totalHours.toFixed(1),
        records: countryRecords.length,
      },
    }
    allNodes.push(countryNode)

    const region = countryRecords[0]?.Region
    if (region) {
      const regionNode = {
        id: `region-${region}`,
        name: region,
        type: "region",
        level: 0,
        color: getSciFiColor(0),
        size: 25,
        hasChildren: true,
        info: {
          type: "Region",
          countries: 1,
        },
      }
      allNodes.push(regionNode)
      allLinks.push({
        source: `region-${region}`,
        target: "country",
        color: "rgba(0, 240, 255, 0.3)",
      })
    }

    // Build complete hierarchy data structure
    const segments = {}
    countryRecords.forEach((record) => {
      const seg = record["Segment (updated)"]
      if (!segments[seg]) {
        segments[seg] = {
          count: 0,
          hours: 0,
          completed: 0,
          inScope: 0,
          associates: new Set(),
          jobFunctions: {},
        }
      }
      segments[seg].count++
      segments[seg].hours += record["Training Hours"] || 0
      segments[seg].associates.add(record["Associate ID"])

      if (record["Course In Scope"] === "Yes") {
        segments[seg].inScope++
        if (record["Item Status"] === "Completed") {
          segments[seg].completed++
        }
      }

      const jobFunc = record["Job Function"]
      const jobFamily = record["Job Family"]
      if (!segments[seg].jobFunctions[jobFunc]) {
        segments[seg].jobFunctions[jobFunc] = {
          count: 0,
          hours: 0,
          completed: 0,
          inScope: 0,
          associates: new Set(),
          jobFamily,
          assignmentTypes: {},
        }
      }
      segments[seg].jobFunctions[jobFunc].count++
      segments[seg].jobFunctions[jobFunc].hours += record["Training Hours"] || 0
      segments[seg].jobFunctions[jobFunc].associates.add(record["Associate ID"])

      if (record["Course In Scope"] === "Yes") {
        segments[seg].jobFunctions[jobFunc].inScope++
        if (record["Item Status"] === "Completed") {
          segments[seg].jobFunctions[jobFunc].completed++
        }
      }

      const assignType = record["Assignment Type"]
      if (!segments[seg].jobFunctions[jobFunc].assignmentTypes[assignType]) {
        segments[seg].jobFunctions[jobFunc].assignmentTypes[assignType] = {
          count: 0,
          hours: 0,
          completed: 0,
          inScope: 0,
          associates: new Set(),
          courses: {},
        }
      }
      segments[seg].jobFunctions[jobFunc].assignmentTypes[assignType].count++
      segments[seg].jobFunctions[jobFunc].assignmentTypes[assignType].hours += record["Training Hours"] || 0
      segments[seg].jobFunctions[jobFunc].assignmentTypes[assignType].associates.add(record["Associate ID"])

      if (record["Course In Scope"] === "Yes") {
        segments[seg].jobFunctions[jobFunc].assignmentTypes[assignType].inScope++
        if (record["Item Status"] === "Completed") {
          segments[seg].jobFunctions[jobFunc].assignmentTypes[assignType].completed++
        }
      }

      const courseName = record.Theme
      if (!segments[seg].jobFunctions[jobFunc].assignmentTypes[assignType].courses[courseName]) {
        segments[seg].jobFunctions[jobFunc].assignmentTypes[assignType].courses[courseName] = {
          count: 0,
          hours: 0,
          completed: 0,
          inScope: 0,
          inProgress: 0,
          overdue: 0,
          associates: new Set(),
          managers: new Set(),
          records: [],
        }
      }
      const course = segments[seg].jobFunctions[jobFunc].assignmentTypes[assignType].courses[courseName]
      course.count++
      course.hours += record["Training Hours"] || 0
      course.associates.add(record["Associate ID"])
      course.managers.add(record["Manager Full Name"])
      course.records.push(record)

      if (record["Course In Scope"] === "Yes") {
        course.inScope++
        if (record["Item Status"] === "Completed") {
          course.completed++
        } else if (record["Item Status"] === "In Progress") {
          course.inProgress++
        } else if (record["Item Status"] === "Overdue") {
          course.overdue++
        }
      }
    })

    // Only show expanded nodes
    if (expandedNodes.has("country")) {
      Object.entries(segments).forEach(([segName, segData]) => {
        const segId = `segment-${segName}`
        const segCompletion = segData.inScope > 0 ? (segData.completed / segData.inScope) * 100 : 0

        allNodes.push({
          id: segId,
          name: segName,
          type: "segment",
          level: 2,
          color: getSciFiColor(2, segCompletion),
          size: 15,
          hasChildren: Object.keys(segData.jobFunctions).length > 0,
          info: {
            type: "Segment",
            completion: segCompletion.toFixed(1) + "%",
            associates: segData.associates.size,
            hours: segData.hours.toFixed(1),
            courses: segData.count,
          },
          detailedData: {
            completed: segData.completed,
            notCompleted: segData.inScope - segData.completed,
            records: countryRecords.filter((r) => r["Segment (updated)"] === segName),
          },
        })
        allLinks.push({
          source: "country",
          target: segId,
          color: "rgba(236, 72, 153, 0.3)",
        })

        if (expandedNodes.has(segId)) {
          Object.entries(segData.jobFunctions).forEach(([jobName, jobData]) => {
            const jobId = `job-${segName}-${jobName}`
            const jobCompletion = jobData.inScope > 0 ? (jobData.completed / jobData.inScope) * 100 : 0

            allNodes.push({
              id: jobId,
              name: jobName,
              type: "jobFunction",
              level: 3,
              color: getSciFiColor(3, jobCompletion),
              size: 12,
              hasChildren: Object.keys(jobData.assignmentTypes).length > 0,
              info: {
                type: "Job Function",
                family: jobData.jobFamily,
                completion: jobCompletion.toFixed(1) + "%",
                associates: jobData.associates.size,
                hours: jobData.hours.toFixed(1),
              },
              detailedData: {
                completed: jobData.completed,
                notCompleted: jobData.inScope - jobData.completed,
                records: countryRecords.filter(
                  (r) => r["Segment (updated)"] === segName && r["Job Function"] === jobName
                ),
              },
            })
            allLinks.push({
              source: segId,
              target: jobId,
              color: "rgba(245, 158, 11, 0.3)",
            })

            if (expandedNodes.has(jobId)) {
              Object.entries(jobData.assignmentTypes).forEach(([assignName, assignData]) => {
                const assignId = `assign-${segName}-${jobName}-${assignName}`
                const assignCompletion = assignData.inScope > 0 ? (assignData.completed / assignData.inScope) * 100 : 0

                allNodes.push({
                  id: assignId,
                  name: assignName,
                  type: "assignmentType",
                  level: 4,
                  color: getSciFiColor(4, assignCompletion),
                  size: 10,
                  hasChildren: Object.keys(assignData.courses).length > 0,
                  info: {
                    type: "Assignment Type",
                    completion: assignCompletion.toFixed(1) + "%",
                    associates: assignData.associates.size,
                    hours: assignData.hours.toFixed(1),
                  },
                  detailedData: {
                    completed: assignData.completed,
                    notCompleted: assignData.inScope - assignData.completed,
                    records: countryRecords.filter(
                      (r) =>
                        r["Segment (updated)"] === segName &&
                        r["Job Function"] === jobName &&
                        r["Assignment Type"] === assignName
                    ),
                  },
                })
                allLinks.push({
                  source: jobId,
                  target: assignId,
                  color: "rgba(6, 182, 212, 0.3)",
                })

                if (expandedNodes.has(assignId)) {
                  Object.entries(assignData.courses).forEach(([courseName, courseData]) => {
                    const courseId = `course-${segName}-${jobName}-${assignName}-${courseName}`
                    const courseCompletion =
                      courseData.inScope > 0 ? (courseData.completed / courseData.inScope) * 100 : 0

                    allNodes.push({
                      id: courseId,
                      name: courseName,
                      type: "course",
                      level: 5,
                      color: getSciFiColor(5, courseCompletion),
                      size: 8,
                      hasChildren: false,
                      info: {
                        type: "Course",
                        completion: courseCompletion.toFixed(1) + "%",
                        associates: courseData.associates.size,
                        managers: courseData.managers.size,
                        hours: courseData.hours.toFixed(1),
                      },
                      detailedData: {
                        completed: courseData.completed,
                        inProgress: courseData.inProgress,
                        overdue: courseData.overdue,
                        notStarted:
                          courseData.inScope - courseData.completed - courseData.inProgress - courseData.overdue,
                        associates: Array.from(courseData.associates),
                        managers: Array.from(courseData.managers),
                        records: courseData.records,
                      },
                    })
                    allLinks.push({
                      source: assignId,
                      target: courseId,
                      color:
                        courseCompletion >= 60
                          ? "rgba(16, 185, 129, 0.3)"
                          : courseCompletion >= 50
                          ? "rgba(251, 191, 36, 0.3)"
                          : "rgba(239, 68, 68, 0.3)",
                    })
                  })
                }
              })
            }
          })
        }
      })
    }

    return { nodes: allNodes, links: allLinks }
  }, [selectedCountry, filteredData, countryMetrics, expandedNodes])

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
    []
  )

  return (
<div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 text-white flex flex-col overflow-hidden">
    {/* Header Section */}
    <div className="border-b border-slate-700/50 bg-gradient-to-r from-slate-900/80 via-slate-800/50 to-slate-900/80 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center justify-between px-8 py-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent mb-1">
            Training Analytics Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <button className="relative hover:text-cyan-400 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a2 2 0 01-3.714 0M6 8a6 6 0 1112 0c0 2.5.667 4.667 2 6.5H4c1.333-1.833 2-4 2-6.5z"
              />
            </svg>
            <span className="absolute top-0 right-0 inline-block w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-slate-900"></span>
          </button>
          <div className="relative">
            <img
              src="https://i.pravatar.cc/40?img=68"
              alt="Profile"
              className="w-9 h-9 rounded-full border border-slate-600 hover:ring-2 hover:ring-cyan-400 transition-all cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>

    {/* Filters Section */}
    <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm px-8 py-3 flex-shrink-0">
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
          label="Courses"
          value={filters.theme}
          onChange={(val) => setFilters({ ...filters, theme: val })}
          options={filterOptions.themes}
          icon="🎨"
        />
      </div>
    </div>

    <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden min-h-0">
      {/* Left Panel - Globe (FIXED) */}
      <div className="w-full lg:w-1/2 flex flex-col min-h-0 bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-900/40 rounded-2xl overflow-hidden border border-slate-700/30 shadow-2xl flex-shrink-0">
        <div className="flex-1 relative w-full h-full">
          <Globe
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
            pointsData={globePoints}
            pointLat="lat"
            pointLng="lng"
            pointColor="color"
            pointAltitude={0.01}
            width={850}
            height={600}
            pointRadius={(d) => d.totalHours / 10}
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
                <span className="text-slate-300">{"<"} 50%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - KPIs and Network Graph (SCROLLABLE) */}
      <div className="w-full lg:w-1/2 min-h-0 bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-900/40 rounded-2xl border border-slate-700/30 shadow-2xl overflow-y-auto flex flex-col">
        <div className="p-4 flex-shrink-0">
          <div className="space-y-4  flex gap-4">
            <KPICard
              title="Completion Rate"
              value={kpis.completionRate.toFixed(1)}
              unit="%"
              gradient="from-blue-600 via-blue-500 to-cyan-500"
              icon="✓"
            />
            <KPICard
              title="Avg Hours per Associate"
              value={kpis.avgHours.toFixed(1)}
              unit="hrs"
              gradient="from-purple-600 via-purple-500 to-pink-500"
              icon="⏱️"
            />
            <KPICard
              title="Total Associates"
              value={kpis.totalAssociates}
              unit="people"
              gradient="from-emerald-600 via-emerald-500 to-teal-500"
              icon="👥"
            />
          </div>
        </div>

        <div className="px-4 pb-2 flex-1 overflow-y-auto">
          {/* Network Graph Section */}
          {selectedCountry ? (
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-100">{selectedCountry} - Hierarchy Analytics</h2>
                <button
                  onClick={() => {
                    setSelectedCountry(null)
                    setSelectedNode(null)
                  }}
                  className="text-slate-400 hover:text-slate-200 transition-colors text-2xl font-light"
                >
                  ✕
                </button>
              </div>

              <div
                className="bg-slate-900/50 rounded-xl overflow-hidden relative border border-slate-700/30"
                style={{ height: "400px" }}
              >
                <ForceGraph3D
                  ref={graphRef}
                  graphData={networkData}
                  width={900}
                  height={400}
                  nodeLabel=""
                  dagMode="td"
                  dagLevelDistance={100}

                  nodeRelSize={8}
                  nodeThreeObject={(node) => {
                    const group = new THREE.Group()

                    // Create glowing sphere with space gradient
                    const geometry = new THREE.SphereGeometry(node.size, 32, 32)

                    // Create gradient texture
                    const canvas = document.createElement("canvas")
                    canvas.width = 256
                    canvas.height = 256
                    const ctx = canvas.getContext("2d")
                    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
                    gradient.addColorStop(0, node.color)
                    gradient.addColorStop(0.5, node.color + "CC")
                    gradient.addColorStop(1, node.color + "00")
                    ctx.fillStyle = gradient
                    ctx.fillRect(0, 0, 256, 256)

                    // const texture = new THREE.CanvasTexture(canvas)

                    const material = new THREE.MeshPhongMaterial({
                      color: node.color,
                      emissive: node.color,
                      emissiveIntensity: 0.6,
                      shininess: 100,
                      transparent: true,
                      opacity: 0.9,
                    })
                    const sphere = new THREE.Mesh(geometry, material)
                    group.add(sphere)

                    // Add outer glow
                    const glowGeometry = new THREE.SphereGeometry(node.size * 1.4, 32, 32)
                    const glowMaterial = new THREE.MeshBasicMaterial({
                      color: node.color,
                      transparent: true,
                      opacity: 0.15,
                    })
                    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
                    group.add(glow)

                    // Add expansion indicator for expandable nodes
                    if (node.hasChildren && !expandedNodes.has(node.id)) {
                      const ringGeometry = new THREE.RingGeometry(node.size * 1.5, node.size * 1.7, 32)
                      const ringMaterial = new THREE.MeshBasicMaterial({
                        color: node.color,
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: 0.5,
                      })
                      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
                      ring.rotation.x = Math.PI / 2
                      group.add(ring)
                    }

                    // Add text sprite
                    const textCanvas = document.createElement("canvas")
                    const context = textCanvas.getContext("2d")
                    textCanvas.width = 512
                    textCanvas.height = 128
                    context.fillStyle = "white"
                    context.font = "bold 32px Arial"
                    context.textAlign = "center"
                    context.shadowColor = "rgba(0,0,0,0.8)"
                    context.shadowBlur = 10
                    context.fillText(node.name.substring(0, 25), 256, 70)

                    const textTexture = new THREE.CanvasTexture(textCanvas)
                    const spriteMaterial = new THREE.SpriteMaterial({
                      map: textTexture,
                      transparent: true,
                    })
                    const sprite = new THREE.Sprite(spriteMaterial)
                    sprite.scale.set(node.size * 5, node.size * 1.5, 1)
                    sprite.position.y = node.size + 20
                    group.add(sprite)

                    return group
                  }}
                  nodeThreeObjectExtend={true}
                  linkColor="color"
                  linkWidth={2}
                  linkOpacity={0.5}
                  linkDirectionalParticles={3}
                  linkDirectionalParticleWidth={3}
                  linkDirectionalParticleSpeed={0.008}
                  backgroundColor="#0f172a"
                  onNodeClick={(node) => {
                    setSelectedNode(node)
                    if (node.hasChildren) {
                      const newExpanded = new Set(expandedNodes)
                      if (newExpanded.has(node.id)) {
                        newExpanded.delete(node.id)
                      } else {
                        newExpanded.add(node.id)
                      }
                      setExpandedNodes(newExpanded)
                    }
                  }}
                  onNodeHover={(node) => setHoveredNode(node)}
                  enableNodeDrag={false}
                  enableNavigationControls={true}
                  showNavInfo={false}
                />

                {/* Hover tooltip */}
                {hoveredNode && (
                  <div className="absolute top-4 left-4 bg-gradient-to-br from-slate-900/95 via-purple-900/30 to-slate-900/95 backdrop-blur-sm p-4 rounded-xl border border-cyan-500/30 shadow-2xl max-w-xs z-10">
                    <div className="font-bold text-sm text-cyan-400 mb-2">{hoveredNode.name}</div>
                    <div className="text-xs space-y-1 text-slate-300">
                      {Object.entries(hoveredNode.info).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-slate-400 capitalize">{key}:</span>
                          <span className="font-medium text-cyan-300">{value}</span>
                        </div>
                      ))}
                      {hoveredNode.hasChildren && !expandedNodes.has(hoveredNode.id) && (
                        <div className="mt-2 text-xs text-amber-400 flex items-center gap-1">
                          <span>▶</span> Click to expand
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Insights Panel */}
              {selectedNode && (
                <div className="mt-4 bg-gradient-to-br from-slate-800/60 via-purple-900/20 to-slate-900/60 rounded-xl p-6 border border-cyan-500/20 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                      {selectedNode.name}
                    </h3>
                    <span className="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-cyan-500/30 rounded-full text-xs text-cyan-300 capitalize">
                      {selectedNode.type}
                    </span>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {Object.entries(selectedNode.info).map(([key, value]) => (
                      <div key={key} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                        <div className="text-xs text-slate-400 mb-1 capitalize">{key}</div>
                        <div className="text-lg font-bold text-white">{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Completion Status */}
                  {selectedNode.detailedData && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200 mb-3">Status Breakdown</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                            <div className="text-xs text-emerald-400 mb-1">Completed</div>
                            <div className="text-2xl font-bold text-emerald-400">
                              {selectedNode.detailedData.completed || 0}
                            </div>
                          </div>
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <div className="text-xs text-red-400 mb-1">Not Completed</div>
                            <div className="text-2xl font-bold text-red-400">
                              {selectedNode.detailedData.notCompleted || 0}
                            </div>
                          </div>
                          {selectedNode.detailedData.inProgress !== undefined && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                              <div className="text-xs text-amber-400 mb-1">In Progress</div>
                              <div className="text-2xl font-bold text-amber-400">
                                {selectedNode.detailedData.inProgress}
                              </div>
                            </div>
                          )}
                          {selectedNode.detailedData.overdue !== undefined && (
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                              <div className="text-xs text-purple-400 mb-1">Overdue</div>
                              <div className="text-2xl font-bold text-purple-400">
                                {selectedNode.detailedData.overdue}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Associates & Managers Table */}
                      {selectedNode.detailedData.records && selectedNode.detailedData.records.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-200 mb-3">Team Members</h4>
                          <div className="bg-slate-900/50 rounded-lg border border-slate-700/30 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-slate-800/50">
                                <tr>
                                  <th className="px-3 py-2 text-left text-slate-400">Name</th>
                                  <th className="px-3 py-2 text-left text-slate-400">Role</th>
                                  <th className="px-3 py-2 text-left text-slate-400">Status</th>
                                  <th className="px-3 py-2 text-left text-slate-400">Manager</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-700/30">
                                {selectedNode.detailedData.records.slice(0, 10).map((record, idx) => (
                                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-3 py-2 text-slate-300">{record["Full Name"]}</td>
                                    <td className="px-3 py-2 text-slate-400">{record["Job Function"]}</td>
                                    <td className="px-3 py-2">
                                      <span
                                        className={`px-2 py-1 rounded-full text-xs ${
                                          record["Item Status"] === "Completed"
                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                            : record["Item Status"] === "In Progress"
                                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                                        }`}
                                      >
                                        {record["Item Status"]}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-slate-400 text-xs">
                                      {record["Manager Full Name"]}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {selectedNode.detailedData.records.length > 10 && (
                              <div className="px-3 py-2 text-xs text-slate-400 bg-slate-800/30 text-center">
                                +{selectedNode.detailedData.records.length - 10} more records
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Manager List for courses */}
                      {selectedNode.type === "course" && selectedNode.detailedData.managers && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-200 mb-2">Managers Involved</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedNode.detailedData.managers.map((manager, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-400"
                              >
                                {manager}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Legend */}
              <div className="mt-4 bg-gradient-to-br from-slate-800/50 via-purple-900/20 to-slate-900/50 rounded-xl p-4 border border-cyan-500/20">
                <div className="font-bold mb-3 text-sm text-cyan-300">Hierarchy Levels</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-500/50"></div>
                    <span className="text-slate-300">Region</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50"></div>
                    <span className="text-slate-300">Country</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-pink-500 shadow-lg shadow-pink-500/50"></div>
                    <span className="text-slate-300">Segment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50"></div>
                    <span className="text-slate-300">Job Function</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-teal-500 shadow-lg shadow-teal-500/50"></div>
                    <span className="text-slate-300">Assignment Type</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
                    <span className="text-slate-300">Course</span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-cyan-400/70 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                  Click nodes with rings to expand • Drag to explore
                </div>
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
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 104 0 2 2 0 012-2h1.064M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-lg font-medium mb-2 text-slate-300">Select a Country</p>
                <p className="text-sm text-slate-400">Click on any point on the globe to view hierarchy analytics</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  )
}

export default TrainingGlobeDashboard