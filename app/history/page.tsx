"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit2, Save, X, Clock, Loader2, Calendar, Sparkles } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore"
import { toast } from "sonner"
import { Navbar } from "@/components/navbar"

interface HistoryEvent {
  id: string
  year: number
  month?: string
  title: string
  description: string
  createdAt?: any
  updatedAt?: any
}

export default function HistoryPage() {
  const { userProfile } = useAuth()
  const isAdmin = userProfile?.role === "admin"

  const [events, setEvents] = useState<HistoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [editingEvent, setEditingEvent] = useState<string | null>(null)
  const [newEvent, setNewEvent] = useState<Partial<HistoryEvent>>({})
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [saving, setSaving] = useState(false)

  // 정렬 함수
  const sortEvents = (events: HistoryEvent[]) => {
    return events.sort((a, b) => {
      // 1. 년도로 정렬 (오래된 것이 위)
      if (a.year !== b.year) {
        return a.year - b.year
      }

      // 2. 같은 년도면 월로 정렬 (오래된 월이 위)
      const monthA = a.month ? Number.parseInt(a.month) : 0
      const monthB = b.month ? Number.parseInt(b.month) : 0
      if (monthA !== monthB) {
        return monthA - monthB
      }

      // 3. 같은 년도, 같은 월이면 생성일시로 정렬 (먼저 추가한 것이 위)
      if (a.createdAt && b.createdAt) {
        const timeA = a.createdAt.seconds || a.createdAt._seconds || 0
        const timeB = b.createdAt.seconds || b.createdAt._seconds || 0
        return timeA - timeB
      }

      return 0
    })
  }

  // Firestore에서 연혁 데이터 로드
  const loadEvents = async () => {
    try {
      setLoading(true)
      const eventsRef = collection(db, "history_events")
      const q = query(eventsRef, orderBy("year", "asc"))
      const querySnapshot = await getDocs(q)

      const eventsData: HistoryEvent[] = []
      querySnapshot.forEach((doc) => {
        eventsData.push({
          id: doc.id,
          ...doc.data(),
        } as HistoryEvent)
      })

      // 정렬 적용
      const sortedEvents = sortEvents(eventsData)
      setEvents(sortedEvents)
    } catch (error) {
      console.error("연혁 로드 실패:", error)
      toast.error("연혁을 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  // 컴포넌트 마운트시 데이터 로드
  useEffect(() => {
    loadEvents()
  }, [])

  // 새 연혁 추가
  const handleAddEvent = async () => {
    if (!newEvent.year || !newEvent.title || !newEvent.description) {
      toast.error("모든 필수 필드를 입력해주세요.")
      return
    }

    try {
      setSaving(true)
      const eventsRef = collection(db, "history_events")
      const docRef = await addDoc(eventsRef, {
        year: newEvent.year,
        month: newEvent.month || null,
        title: newEvent.title,
        description: newEvent.description,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // 로컬 상태 업데이트
      const newEventData: HistoryEvent = {
        id: docRef.id,
        year: newEvent.year,
        month: newEvent.month,
        title: newEvent.title,
        description: newEvent.description,
        createdAt: { seconds: Date.now() / 1000 }, // 임시 타임스탬프
      }

      setEvents((prev) => {
        const newEvents = [...prev, newEventData]
        return sortEvents(newEvents)
      })
      setNewEvent({})
      setIsAddingNew(false)
      toast.success("연혁이 추가되었습니다.")
    } catch (error) {
      console.error("연혁 추가 실패:", error)
      toast.error("연혁 추가에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  // 연혁 수정
  const handleSaveEvent = async (eventId: string, updatedEvent: Partial<HistoryEvent>) => {
    try {
      setSaving(true)
      const eventRef = doc(db, "history_events", eventId)
      await updateDoc(eventRef, {
        ...updatedEvent,
        updatedAt: serverTimestamp(),
      })

      // 로컬 상태 업데이트
      setEvents((prev) => {
        const updatedEvents = prev.map((event) => (event.id === eventId ? { ...event, ...updatedEvent } : event))
        return sortEvents(updatedEvents)
      })
      setEditingEvent(null)
      toast.success("연혁이 수정되었습니다.")
    } catch (error) {
      console.error("연혁 수정 실패:", error)
      toast.error("연혁 수정에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  // 연혁 삭제
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("정말로 이 연혁을 삭제하시겠습니까?")) {
      return
    }

    try {
      setSaving(true)
      const eventRef = doc(db, "history_events", eventId)
      await deleteDoc(eventRef)

      // 로컬 상태 업데이트
      setEvents((prev) => prev.filter((event) => event.id !== eventId))
      toast.success("연혁이 삭제되었습니다.")
    } catch (error) {
      console.error("연혁 삭제 실패:", error)
      toast.error("연혁 삭제에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-6 text-cyan-400" />
            <div className="absolute inset-0 w-12 h-12 mx-auto rounded-full bg-cyan-400/20 animate-pulse"></div>
          </div>
          <p className="text-slate-400 text-lg font-medium">연혁을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-900 text-white">
        {/* 헤더 섹션 - 개선된 디자인 */}
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
              {/* 로고와 아이콘 */}
              <div className="mb-12 flex items-center justify-center gap-4">
                <div className="relative">
                  <img src="/NT-Logo_v2.png" alt="NT-SecurityChallenges" className="h-24 mx-auto drop-shadow-2xl" />
                  <div className="absolute -top-2 -right-2">
                    <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* 제목 */}
              <h1 className="text-7xl font-black mb-8 tracking-tight">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  연혁
                </span>
              </h1>

              {/* 부제목 */}
              <p className="text-2xl text-slate-300 font-light leading-relaxed mb-8">
                NT-SecurityChallenges의 발전 과정과 주요 성과를
                <br />
                <span className="text-cyan-400 font-medium">시간의 흐름</span>으로 살펴보세요
              </p>

              {/* 장식 요소 */}
              <div className="flex items-center justify-center gap-2 text-slate-500">
                <div className="w-12 h-px bg-gradient-to-r from-transparent to-cyan-400"></div>
                <Calendar className="w-5 h-5 text-cyan-400" />
                <div className="w-12 h-px bg-gradient-to-l from-transparent to-cyan-400"></div>
              </div>
            </div>
          </div>
        </div>

        {/* 타임라인 섹션 */}
        <div className="container mx-auto px-4 py-20">
          {/* 관리자 컨트롤 */}
          {isAdmin && (
            <div className="mb-16 text-center">
              <Button
                onClick={() => setIsAddingNew(true)}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105"
                disabled={saving}
              >
                <Plus className="w-5 h-5 mr-2" />새 이벤트 추가
              </Button>
            </div>
          )}

          {/* 새 이벤트 추가 폼 */}
          {isAddingNew && isAdmin && (
            <Card className="mb-16 bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50 backdrop-blur-sm shadow-2xl">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Input
                    type="number"
                    placeholder="년도"
                    value={newEvent.year || ""}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, year: Number.parseInt(e.target.value) }))}
                    className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-400/20 rounded-lg"
                  />
                  <Input
                    placeholder="월 (선택사항)"
                    value={newEvent.month || ""}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, month: e.target.value }))}
                    className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-400/20 rounded-lg"
                  />
                  <Input
                    placeholder="제목"
                    value={newEvent.title || ""}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
                    className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-400/20 rounded-lg"
                  />
                </div>
                <Textarea
                  placeholder="설명"
                  value={newEvent.description || ""}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, description: e.target.value }))}
                  className="mb-6 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-400/20 rounded-lg"
                  rows={4}
                />
                <div className="flex gap-3">
                  <Button
                    onClick={handleAddEvent}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-6 py-2 rounded-lg shadow-lg transition-all duration-300"
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    저장
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddingNew(false)
                      setNewEvent({})
                    }}
                    className="border-slate-600/50 text-slate-300 hover:bg-slate-800/50 bg-transparent rounded-lg"
                    disabled={saving}
                  >
                    <X className="w-4 h-4 mr-2" />
                    취소
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 연혁이 없을 때 */}
          {events.length === 0 ? (
            <div className="text-center py-32">
              <div className="relative mb-12">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-slate-800 to-slate-700 rounded-full flex items-center justify-center shadow-2xl">
                  <Clock className="w-16 h-16 text-slate-400" />
                </div>
                <div className="absolute -top-2 -right-8 w-6 h-6 bg-cyan-400/20 rounded-full animate-ping"></div>
              </div>
              <h3 className="text-3xl font-bold text-slate-300 mb-6">아직 등록된 연혁이 없습니다</h3>
              {isAdmin ? (
                <p className="text-xl text-slate-400 mb-8">관리자로서 첫 번째 연혁을 추가해보세요.</p>
              ) : (
                <p className="text-xl text-slate-400 mb-8">곧 흥미로운 연혁들이 추가될 예정입니다.</p>
              )}
            </div>
          ) : (
            /* 개선된 타임라인 - 년도별 오름차순, 같은 년도는 월별 오름차순, 같은 년도/월은 생성일시 오름차순 */
            <div className="relative max-w-6xl mx-auto">
              {/* 중앙 라인 - 그라데이션 효과 */}
              <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full">
                <div className="w-full h-full bg-gradient-to-b from-cyan-500 via-blue-500 to-purple-500 rounded-full shadow-lg shadow-cyan-500/20"></div>
              </div>

              <div className="space-y-20">
                {events.map((event, index) => (
                  <div key={event.id} className="relative group">
                    {/* 타임라인 포인트 - 개선된 디자인 */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 z-20">
                      <div className="relative">
                        <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full border-4 border-black shadow-lg shadow-cyan-500/30 group-hover:scale-125 transition-transform duration-300"></div>
                        <div className="absolute inset-0 w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-ping opacity-20"></div>
                      </div>
                    </div>

                    {/* 이벤트 카드 - 개선된 레이아웃 */}
                    <div className={`flex items-center ${index % 2 === 0 ? "flex-row-reverse" : ""}`}>
                      <div className="w-1/2"></div>
                      <div className={`w-1/2 ${index % 2 === 0 ? "pr-16" : "pl-16"}`}>
                        <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500 transform hover:scale-105 group-hover:border-cyan-500/30">
                          <CardContent className="p-8">
                            {editingEvent === event.id && isAdmin ? (
                              <EditEventForm
                                event={event}
                                onSave={(updatedEvent) => handleSaveEvent(event.id, updatedEvent)}
                                onCancel={() => setEditingEvent(null)}
                                onDelete={() => handleDeleteEvent(event.id)}
                                saving={saving}
                              />
                            ) : (
                              <>
                                <div className="flex items-center justify-between mb-6">
                                  <div className="flex items-center gap-4">
                                    <Badge
                                      variant="outline"
                                      className="text-3xl font-black px-6 py-3 border-2 border-cyan-500/50 text-cyan-400 bg-cyan-500/10 rounded-xl shadow-lg"
                                    >
                                      {event.year}
                                    </Badge>
                                    {event.month && (
                                      <Badge
                                        variant="secondary"
                                        className="bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold px-4 py-2 rounded-lg shadow-lg"
                                      >
                                        {event.month}월
                                      </Badge>
                                    )}
                                  </div>
                                  {isAdmin && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingEvent(event.id)}
                                      className="text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-300"
                                      disabled={saving}
                                    >
                                      <Edit2 className="w-5 h-5" />
                                    </Button>
                                  )}
                                </div>
                                <h3 className="text-2xl font-bold mb-4 text-white leading-tight">{event.title}</h3>
                                <p className="text-slate-300 leading-relaxed text-lg">{event.description}</p>

                                {/* 장식 요소 */}
                                <div className="mt-6 flex items-center gap-2 text-slate-500">
                                  <div className="w-8 h-px bg-gradient-to-r from-transparent to-cyan-400/50"></div>
                                  <div className="w-2 h-2 bg-cyan-400/50 rounded-full"></div>
                                  <div className="w-8 h-px bg-gradient-to-l from-transparent to-cyan-400/50"></div>
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

interface EditEventFormProps {
  event: HistoryEvent
  onSave: (event: Partial<HistoryEvent>) => void
  onCancel: () => void
  onDelete: () => void
  saving: boolean
}

function EditEventForm({ event, onSave, onCancel, onDelete, saving }: EditEventFormProps) {
  const [formData, setFormData] = useState({
    year: event.year,
    month: event.month || "",
    title: event.title,
    description: event.description,
  })

  const handleSubmit = () => {
    if (!formData.year || !formData.title || !formData.description) {
      toast.error("모든 필수 필드를 입력해주세요.")
      return
    }
    onSave(formData)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          type="number"
          placeholder="년도"
          value={formData.year}
          onChange={(e) => setFormData((prev) => ({ ...prev, year: Number.parseInt(e.target.value) }))}
          className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-400/20 rounded-lg"
        />
        <Input
          placeholder="월 (선택사항)"
          value={formData.month}
          onChange={(e) => setFormData((prev) => ({ ...prev, month: e.target.value }))}
          className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-400/20 rounded-lg"
        />
      </div>
      <Input
        placeholder="제목"
        value={formData.title}
        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
        className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-400/20 rounded-lg"
      />
      <Textarea
        placeholder="설명"
        value={formData.description}
        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
        className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-400/20 rounded-lg"
        rows={4}
      />
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-6 py-2 rounded-lg shadow-lg transition-all duration-300"
          disabled={saving}
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          저장
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-slate-600/50 text-slate-300 hover:bg-slate-800/50 bg-transparent rounded-lg"
          disabled={saving}
        >
          <X className="w-4 h-4 mr-2" />
          취소
        </Button>
        <Button
          variant="destructive"
          onClick={onDelete}
          className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold px-6 py-2 rounded-lg shadow-lg transition-all duration-300"
          disabled={saving}
        >
          삭제
        </Button>
      </div>
    </div>
  )
}
