import { useState } from "react";
import Plot from "react-plotly.js";
import { bubbleData, createSurfaceData, scatter3dData } from "./3d-Chart";
import { employeeData } from "../utils/EmployeeData";
import { deptColors } from "../utils/DeptColors";

const Dashboard = () => {
  const [selectedChart, setSelectedChart] = useState("scatter3d");

  const commonLayout = {
    paper_bgcolor: "#0f172a",
    plot_bgcolor: "#1e293b",
    font: { color: "#e2e8f0", family: "Inter, sans-serif" },
    autosize: true,
    margin: { l: 0, r: 0, t: 40, b: 0 },
  };

  const charts = {
    scatter3d: {
      data: scatter3dData,
      layout: {
        ...commonLayout,
        title: {
          text: "Employee Performance Analysis (3D)",
          font: { size: 20, color: "#f1f5f9" },
        },
        scene: {
          xaxis: {
            title: "Salary ($)",
            gridcolor: "#334155",
            color: "#94a3b8",
          },
          yaxis: {
            title: "Performance Rating",
            gridcolor: "#334155",
            color: "#94a3b8",
          },
          zaxis: {
            title: "Tenure (Years)",
            gridcolor: "#334155",
            color: "#94a3b8",
          },
          bgcolor: "#1e293b",
          camera: {
            eye: { x: 1.5, y: 1.5, z: 1.3 },
          },
        },
      },
    },
    surface: {
      data: createSurfaceData(),
      layout: {
        ...commonLayout,
        title: {
          text: "Department Metrics Surface Map",
          font: { size: 20, color: "#f1f5f9" },
        },
        scene: {
          xaxis: { title: "Metrics", gridcolor: "#334155", color: "#94a3b8" },
          yaxis: {
            title: "Department",
            gridcolor: "#334155",
            color: "#94a3b8",
          },
          zaxis: {
            title: "Normalized Value",
            gridcolor: "#334155",
            color: "#94a3b8",
          },
          bgcolor: "#1e293b",
          camera: {
            eye: { x: 1.7, y: 1.7, z: 1.5 },
          },
        },
      },
    },
    bubble: {
      data: bubbleData(),
      layout: {
        ...commonLayout,
        title: {
          text: "Employee Distribution by Location (3D)",
          font: { size: 20, color: "#f1f5f9" },
        },
        scene: {
          xaxis: {
            title: "Salary ($)",
            gridcolor: "#334155",
            color: "#94a3b8",
          },
          yaxis: {
            title: "Performance",
            gridcolor: "#334155",
            color: "#94a3b8",
          },
          zaxis: { title: "Age", gridcolor: "#334155", color: "#94a3b8" },
          bgcolor: "#1e293b",
          camera: {
            eye: { x: 1.5, y: -1.5, z: 1.3 },
          },
        },
        showlegend: true,
        legend: { x: 0.7, y: 0.9, bgcolor: "rgba(30, 41, 59, 0.8)" },
      },
    },
  };

  const currentChart = charts[selectedChart];

  return (
    <div className="min-h-screen  bg-linear-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-2xl">
          <h1 className="text-4xl font-bold text-white mb-2 bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text">
            Employee Dashboard
          </h1>

          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-linear-to-br from-blue-500/20 to-blue-600/20 p-4 rounded-xl border border-blue-500/30">
              <div className="text-blue-300 text-sm">Total Employees</div>
              <div className="text-3xl font-bold text-white">
                {employeeData.length}
              </div>
            </div>
            <div className="bg-linear-to-br from-green-500/20 to-green-600/20 p-4 rounded-xl border border-green-500/30">
              <div className="text-green-300 text-sm">Avg Performance</div>
              <div className="text-3xl font-bold text-white">
                {(
                  employeeData.reduce((sum, e) => sum + e.performance, 0) /
                  employeeData.length
                ).toFixed(1)}
              </div>
            </div>
            <div className="bg-linear-to-br from-amber-500/20 to-amber-600/20 p-4 rounded-xl border border-amber-500/30">
              <div className="text-amber-300 text-sm">Avg Salary</div>
              <div className="text-3xl font-bold text-white">
                $
                {(
                  employeeData.reduce((sum, e) => sum + e.salary, 0) /
                  employeeData.length /
                  1000
                ).toFixed(0)}
                K
              </div>
            </div>
            <div className="bg-linear-to-br from-purple-500/20 to-purple-600/20 p-4 rounded-xl border border-purple-500/30">
              <div className="text-purple-300 text-sm">Departments</div>
              <div className="text-3xl font-bold text-white">4</div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex gap-3">
          <button
            onClick={() => setSelectedChart("scatter3d")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              selectedChart === "scatter3d"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
            }`}
          >
            📊 Performance Analysis
          </button>
          <button
            onClick={() => setSelectedChart("surface")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              selectedChart === "surface"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
            }`}
          >
            🗺️ Surface Map
          </button>
          <button
            onClick={() => setSelectedChart("bubble")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              selectedChart === "bubble"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
            }`}
          >
            🌐 Location Distribution
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-2xl">
          <Plot
            data={currentChart.data}
            layout={currentChart.layout}
            config={{
              displayModeBar: true,
              displaylogo: false,
              responsive: true,
              modeBarButtonsToRemove: ["toImage"],
            }}
            style={{ width: "100%", height: "600px" }}
          />
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-6">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-3">Department</h3>
          <div className="flex gap-6">
            {Object.entries(deptColors).map(([dept, color]) => (
              <div key={dept} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="text-slate-300">{dept}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
