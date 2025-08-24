"use client"

import type React from "react"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Mail, Send, Flag } from "lucide-react"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"

export default function ContactPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const [problemTitle, setProblemTitle] = useState("")
  const [problemDescription, setProblemDescription] = useState("")
  const [isSuggesting, setIsSuggesting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({
        title: "입력 오류",
        description: "모든 필드를 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "문의 접수 완료",
        description: "문의해주셔서 감사합니다. 빠른 시일 내에 답변드리겠습니다.",
      })

      setName("")
      setEmail("")
      setMessage("")
    } catch (error) {
      console.error("Error submitting contact form:", error)
      toast({
        title: "문의 접수 실패",
        description: "문의 접수 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleProblemSuggestion = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!problemTitle.trim() || !problemDescription.trim()) {
      toast({
        title: "입력 오류",
        description: "문제 제목과 설명을 모두 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsSuggesting(true)

    try {
      const suggestionData = {
        title: problemTitle.trim(),
        description: problemDescription.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      }

      await addDoc(collection(db, "problem_suggestions"), suggestionData)

      toast({
        title: "문제 제안 완료",
        description: "소중한 아이디어를 보내주셔서 감사합니다! 검토 후 반영하겠습니다.",
      })

      setProblemTitle("")
      setProblemDescription("")
    } catch (error) {
      console.error("Error submitting problem suggestion:", error)
      toast({
        title: "제안 실패",
        description: "문제 제안 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSuggesting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6 grid gap-8 md:grid-cols-2">
          {/* 연락처 섹션 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Mail className="h-6 w-6" />
                문의하기
              </CardTitle>
              <CardDescription>문의사항이 있으시면 언제든지 연락주세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="이름을 입력하세요"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일 주소를 입력하세요"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">메시지</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="문의 내용을 입력하세요"
                    rows={5}
                  />
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      전송 중...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      문의하기
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 문제 제안 섹션 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Flag className="h-6 w-6" />
                문제 제안하기
              </CardTitle>
              <CardDescription>새로운 문제 아이디어를 제안해주세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleProblemSuggestion}>
                <div className="space-y-2">
                  <Label htmlFor="problemTitle">문제 제목</Label>
                  <Input
                    id="problemTitle"
                    value={problemTitle}
                    onChange={(e) => setProblemTitle(e.target.value)}
                    placeholder="문제 제목을 입력하세요"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="problemDescription">문제 설명</Label>
                  <Textarea
                    id="problemDescription"
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    placeholder="문제에 대한 설명을 입력하세요"
                    rows={5}
                  />
                </div>
                <Button type="submit" disabled={isSuggesting} className="w-full">
                  {isSuggesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      제안 중...
                    </>
                  ) : (
                    <>
                      <Flag className="mr-2 h-4 w-4" />
                      문제 제안하기
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
