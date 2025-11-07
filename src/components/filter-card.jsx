
export default function FilterCard({ label, value, onChange, options }) {
  return (
    <div className="relative group w-fit">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-1 hover:border-slate-600/50 transition-all duration-300">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-700/50 text-slate-100 text-sm rounded-md px-2 py-2 border border-slate-600/30 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all duration-200 cursor-pointer hover:bg-slate-700/70"
        >
          <option value="all">All {label}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
