"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Loader2,
  Plus,
  X,
  FileText,
  MessageSquare,
  HelpCircle,
  Briefcase,
  Info,
  Code,
  BookOpen,
  UserPlus,
  Trophy,
  Megaphone,
  Star,
} from "lucide-react"
import Link from "next/link"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"

// 카테고리 정의
const CATEGORIES = [
  { id: "자유게시판", name: "💬 자유게시판", icon: MessageSquare },
  { id: "Q&A", name: "❓ Q&A", icon: HelpCircle },
  { id: "이직/커리어", name: "💼 이직/커리어", icon: Briefcase },
  { id: "정보공유", name: "💡 정보공유", icon: Info },
  { id: "테크", name: "⚡ 테크", icon: Code },
  { id: "스터디", name: "📚 스터디", icon: BookOpen },
  { id: "팀원모집", name: "👥 팀원모집", icon: UserPlus },
  { id: "대회", name: "🏆 대회", icon: Trophy },
  { id: "행사홍보", name: "🎉 행사홍보", icon: Megaphone },
  { id: "후기", name: "✍️ 후기", icon: Star },
]

export default function CreateCommunityPostPage() {
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("자유게시판")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [isPinned, setIsPinned] = useState(false)
  const [isNotice, setIsNotice] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  // 관리자가 아닌 경우 접근 차단
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-4">접근 권한이 없습니다</h1>
              <p className="text-muted-foreground mb-6">관리자만 게시글을 작성할 수 있습니다.</p>
              <Link href="/community">
                <Button>커뮤니티로 돌아가기</Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // 태그 추가
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 5) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  // 태그 제거
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  // 게시글 작성
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !content.trim()) {
      toast({
        title: "입력 오류",
        description: "제목과 내용을 모두 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    if (!user || !userProfile) {
      toast({
        title: "인증 오류",
        description: "로그인이 필요합니다.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const postData = {
        title: title.trim(),
        content: content.trim(),
        category,
        tags,
        author: userProfile.displayName || userProfile.username || "익명",
        authorId: user.uid,
        authorPhotoURL: userProfile.photoURL || null,
        isPinned: isAdmin ? isPinned : false,
        isNotice: isAdmin ? isNotice : false,
        viewCount: 0,
        commentCount: 0,
        likeCount: 0,
        viewedBy: [],
        likedBy: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, "community_posts"), postData)

      toast({
        title: "게시글 작성 완료",
        description: "게시글이 성공적으로 작성되었습니다.",
      })

      router.push(`/community/${docRef.id}`)
    } catch (error: any) {
      console.error("Error creating post:", error)
      toast({
        title: "작성 실패",
        description: `게시글 작성 중 오류가 발생했습니다: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          {/* 헤더 */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/community">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                돌아가기
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">게시글 작성</h1>
              <p className="text-muted-foreground mt-1">새로운 게시글을 작성해보세요</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  기본 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 제목 */}
                <div className="space-y-2">
                  <Label htmlFor="title">제목 *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="게시글 제목을 입력하세요"
                    maxLength={100}
                    required
                  />
                  <p className="text-xs text-muted-foreground">{title.length}/100자</p>
                </div>

                {/* 카테고리 */}
                <div className="space-y-2">
                  <Label htmlFor="category">카테고리 *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="카테고리를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <cat.icon className="h-4 w-4" />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 태그 */}
                <div className="space-y-2">
                  <Label htmlFor="tags">태그 (최대 5개)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="태그를 입력하세요"
                      maxLength={20}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addTag()
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addTag}
                      disabled={!newTag.trim() || tags.length >= 5}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          #{tag}
                          <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* 관리자 옵션 */}
                {isAdmin && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-sm">관리자 옵션</h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="isPinned">상단 고정</Label>
                        <p className="text-xs text-muted-foreground">게시글을 목록 상단에 고정합니다</p>
                      </div>
                      <Switch id="isPinned" checked={isPinned} onCheckedChange={setIsPinned} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="isNotice">공지사항</Label>
                        <p className="text-xs text-muted-foreground">게시글을 공지사항으로 설정합니다</p>
                      </div>
                      <Switch id="isNotice" checked={isNotice} onCheckedChange={setIsNotice} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 내용 */}
            <Card>
              <CardHeader>
                <CardTitle>내용 *</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="게시글 내용을 입력하세요"
                    rows={15}
                    required
                  />
                  <p className="text-xs text-muted-foreground">{content.length}자</p>
                </div>
              </CardContent>
            </Card>

            {/* 작성 버튼 */}
            <div className="flex justify-end gap-4">
              <Link href="/community">
                <Button variant="outline" disabled={isSubmitting}>
                  취소
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    작성 중...
                  </>
                ) : (
                  "게시글 작성"
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}
