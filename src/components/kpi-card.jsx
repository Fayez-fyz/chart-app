
export default function KPICard({ title, value, unit, gradient, icon, trend }) {
  return (
    <div className="group relative w-full">
      <div
        className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-500`}
      ></div>

      <div
        className={`relative bg-gradient-to-br ${gradient} rounded-xl p-4 overflow-hidden border border-white/10 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-white/20`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-white/80 text-xs uppercase font-semibold tracking-wider mb-1">{title}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">{value}</span>
                {unit && <span className="text-sm text-white/70 font-medium">{unit}</span>}
              </div>
            </div>
            <div className="text-3xl opacity-80">{icon}</div>
          </div>

          {trend && (
            <div className="flex items-center gap-1 text-xs font-semibold text-white/80 bg-white/10 w-fit px-2 py-1 rounded-full backdrop-blur-sm">
              <span>↑</span>
              <span>{trend}</span>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
    </div>
  )
}
