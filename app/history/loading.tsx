import { Loader2, Calendar, Sparkles } from "lucide-react"

export default function HistoryLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-900 text-white">
      {/* 헤더 스켈레톤 */}
      <div className="relative overflow-hidden">
        {/* 배경 효과 */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5"></div>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative container mx-auto px-4 py-24">
          <div className="text-center max-w-4xl mx-auto">
            {/* 로고 스켈레톤 */}
            <div className="mb-12 flex items-center justify-center gap-4">
              <div className="relative">
                <div className="h-24 w-32 bg-slate-800/50 rounded-lg animate-pulse"></div>
                <div className="absolute -top-2 -right-2">
                  <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
                </div>
              </div>
            </div>

            {/* 제목 스켈레톤 */}
            <div className="mb-8">
              <div className="h-20 w-64 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-lg mx-auto animate-pulse"></div>
            </div>

            {/* 부제목 스켈레톤 */}
            <div className="mb-8 space-y-4">
              <div className="h-6 w-96 bg-slate-800/50 rounded mx-auto animate-pulse"></div>
              <div className="h-6 w-80 bg-slate-800/50 rounded mx-auto animate-pulse"></div>
            </div>

            {/* 장식 요소 */}
            <div className="flex items-center justify-center gap-2 text-slate-500">
              <div className="w-12 h-px bg-gradient-to-r from-transparent to-cyan-400/50"></div>
              <Calendar className="w-5 h-5 text-cyan-400 animate-pulse" />
              <div className="w-12 h-px bg-gradient-to-l from-transparent to-cyan-400/50"></div>
            </div>
          </div>
        </div>
      </div>

      {/* 타임라인 스켈레톤 */}
      <div className="container mx-auto px-4 py-20">
        {/* 관리자 버튼 스켈레톤 */}
        <div className="mb-16 text-center">
          <div className="h-12 w-48 bg-slate-800/50 rounded-xl mx-auto animate-pulse"></div>
        </div>

        {/* 타임라인 스켈레톤 */}
        <div className="relative max-w-6xl mx-auto">
          {/* 중앙 라인 */}
          <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full">
            <div className="w-full h-full bg-gradient-to-b from-cyan-500/30 via-blue-500/30 to-purple-500/30 rounded-full"></div>
          </div>

          <div className="space-y-20">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="relative group">
                {/* 타임라인 포인트 */}
                <div className="absolute left-1/2 transform -translate-x-1/2 z-20">
                  <div className="relative">
                    <div className="w-8 h-8 bg-gradient-to-r from-cyan-500/50 to-blue-500/50 rounded-full border-4 border-black animate-pulse"></div>
                  </div>
                </div>

                {/* 이벤트 카드 스켈레톤 */}
                <div className={`flex items-center ${index % 2 === 0 ? "flex-row-reverse" : ""}`}>
                  <div className="w-1/2"></div>
                  <div className={`w-1/2 ${index % 2 === 0 ? "pr-16" : "pl-16"}`}>
                    <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-slate-700/30 backdrop-blur-sm shadow-2xl rounded-lg p-8">
                      {/* 년도와 월 스켈레톤 */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-20 bg-slate-700/50 rounded-xl animate-pulse"></div>
                        <div className="h-8 w-16 bg-slate-700/50 rounded-lg animate-pulse"></div>
                      </div>

                      {/* 제목 스켈레톤 */}
                      <div className="h-8 w-3/4 bg-slate-700/50 rounded mb-4 animate-pulse"></div>

                      {/* 설명 스켈레톤 */}
                      <div className="space-y-3 mb-6">
                        <div className="h-4 w-full bg-slate-700/50 rounded animate-pulse"></div>
                        <div className="h-4 w-5/6 bg-slate-700/50 rounded animate-pulse"></div>
                        <div className="h-4 w-4/5 bg-slate-700/50 rounded animate-pulse"></div>
                      </div>

                      {/* 장식 요소 */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-px bg-slate-700/50"></div>
                        <div className="w-2 h-2 bg-slate-700/50 rounded-full"></div>
                        <div className="w-8 h-px bg-slate-700/50"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 로딩 인디케이터 */}
        <div className="text-center mt-20">
          <div className="relative inline-block">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <div className="absolute inset-0 w-8 h-8 rounded-full bg-cyan-400/20 animate-pulse"></div>
          </div>
          <p className="text-slate-400 text-lg font-medium mt-4">연혁을 불러오는 중...</p>
        </div>
      </div>
    </div>
  )
}
