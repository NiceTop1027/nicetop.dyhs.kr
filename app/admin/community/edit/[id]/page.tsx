"use client"

import type React from "react"
import type { Block } from "@/types/block" // Declare Block variable

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, ArrowLeft, Loader2, X, Plus, Link2, Tag, FileText } from "lucide-react"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { db, storage } from "@/lib/firebase-config"
import { FileUploader } from "@/components/file-uploader"
import MarkdownEditor from "@/components/markdown-editor"

type Post = {
  id: string
  title: string
  content: string
  author: string
  authorId: string
  authorPhotoURL?: string
  createdAt: any
  updatedAt?: any
  views: number
  comments: number
  isPinned: boolean
  isNotice: boolean
  files?: string[]
  links?: { url: string; title: string }[]
  tags?: string[]
  editorBlocks?: Block[]
}

export default function EditCommunityPostPage() {
  const params = useParams()
  const postId = params.id as string
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  // 폼 상태
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isNotice, setIsNotice] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [fileUrls, setFileUrls] = useState<string[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [links, setLinks] = useState<{ url: string; title: string }[]>([])
  const [newLinkUrl, setNewLinkUrl] = useState("")
  const [newLinkTitle, setNewLinkTitle] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")
  const [originalAuthorId, setOriginalAuthorId] = useState("")
  const [originalPost, setOriginalPost] = useState<Post | null>(null)

  // 관리자 권한 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  // 게시글 불러오기
  useEffect(() => {
    const fetchPost = async () => {
      try {
        console.log("Fetching post with ID:", postId)
        const postRef = doc(db, "community_posts", postId)
        const postSnap = await getDoc(postRef)

        if (postSnap.exists()) {
          const postData = postSnap.data() as Post
          console.log("Post data:", postData)

          setTitle(postData.title || "")
          setContent(postData.content || "")
          setIsNotice(postData.isNotice || false)
          setIsPinned(postData.isPinned || false)
          setFileUrls(postData.files || [])
          setLinks(postData.links || [])
          setTags(postData.tags || [])
          setOriginalAuthorId(postData.authorId || "")
          setOriginalPost({ id: postSnap.id, ...postData })

          // 에디터 블록 데이터 설정
          // if (postData.editorBlocks && postData.editorBlocks.length > 0) {
          //   setEditorBlocks(postData.editorBlocks)
          // } else {
          //   // 기존 HTML 콘텐츠를 기본 텍스트 블록으로 변환
          //   setEditorBlocks([
          //     {
          //       id: "converted-content",
          //       type: "paragraph",
          //       content: postData.content.replace(/<[^>]*>/g, ""),
          //     },
          //   ])
          // }

          // 권한 확인
          if (!isAdmin && user?.uid !== postData.authorId) {
            toast({
              title: "접근 권한이 없습니다",
              description: "자신이 작성한 게시글만 수정할 수 있습니다.",
              variant: "destructive",
            })
            router.push("/community")
          }
        } else {
          console.log("Post not found")
          setError("게시글을 찾을 수 없습니다.")
        }
      } catch (error) {
        console.error("Error fetching post:", error)
        setError("게시글을 불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    if (postId && user) {
      fetchPost()
    }
  }, [postId, user, isAdmin, router, toast])

  // 권한 확인
  useEffect(() => {
    if (user && userProfile && !isLoading) {
      const isAuthor = user.uid === originalAuthorId
      if (!isAdmin && !isAuthor) {
        toast({
          title: "접근 권한이 없습니다",
          description: "자신이 작성한 게시글만 수정할 수 있습니다.",
          variant: "destructive",
        })
        router.push("/community")
      }
    }
  }, [user, userProfile, originalAuthorId, isAdmin, isLoading, router, toast])

  // 에디터 블록 변경 핸들러
  // const handleEditorChange = (blocks: Block[]) => {
  //   setEditorBlocks(blocks)

  //   // HTML로 변환
  //   const htmlContent = blocks
  //     .map((block) => {
  //       switch (block.type) {
  //         case "paragraph":
  //           return `<p>${block.content}</p>`
  //         case "heading1":
  //           return `<h1>${block.content}</h1>`
  //         case "heading2":
  //           return `<h2>${block.content}</h2>`
  //         case "image":
  //           return `<figure>
  //             <img src="${block.imageUrl}" alt="${block.content}" />
  //             ${block.content ? `<figcaption>${block.content}</figcaption>` : ""}
  //           </figure>`
  //         case "code":
  //           return `<pre><code class="language-${block.language}">${block.content}</code></pre>`
  //         case "bulletList":
  //           return `<ul>
  //             ${(block.items || []).map((item) => `<li>${item}</li>`).join("")}
  //           </ul>`
  //         case "numberedList":
  //           return `<ol>
  //             ${(block.items || []).map((item) => `<li>${item}</li>`).join("")}
  //           </ol>`
  //         case "divider":
  //           return `<hr />`
  //         default:
  //           return ""
  //       }
  //     })
  //     .join("\n")

  //   setContent(htmlContent)
  // }

  // 파일 업로드 처리
  const handleFileUpload = async (files: File[]) => {
    if (!user) return

    setIsUploading(true)
    const urls: string[] = []

    try {
      for (const file of files) {
        const storageRef = ref(storage, `community_files/${user.uid}/${Date.now()}_${file.name}`)
        await uploadBytes(storageRef, file)
        const downloadUrl = await getDownloadURL(storageRef)
        urls.push(downloadUrl)
      }

      setFileUrls((prev) => [...prev, ...urls])
      setUploadedFiles((prev) => [...prev, ...files])
      toast({
        title: "파일 업로드 완료",
        description: `${files.length}개의 파일이 업로드되었습니다.`,
      })
    } catch (error) {
      console.error("Error uploading files:", error)
      toast({
        title: "파일 업로드 실패",
        description: "파일 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // 파일 삭제
  const handleRemoveFile = async (index: number) => {
    const fileUrl = fileUrls[index]

    try {
      // Firebase Storage에서 파일 삭제 시도
      if (fileUrl.includes("firebase") && fileUrl.includes("storage")) {
        try {
          const fileRef = ref(storage, fileUrl)
          await deleteObject(fileRef)
          console.log("File deleted from storage:", fileUrl)
        } catch (error) {
          console.error("Error deleting file from storage:", error)
          // 스토리지 삭제 실패해도 UI에서는 제거
        }
      }

      // UI에서 파일 제거
      setFileUrls(fileUrls.filter((_, i) => i !== index))

      toast({
        title: "파일 삭제 완료",
        description: "파일이 삭제되었습니다.",
      })
    } catch (error) {
      console.error("Error removing file:", error)
      toast({
        title: "파일 삭제 실패",
        description: "파일 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 링크 추가 핸들러
  const handleAddLink = () => {
    if (newLinkUrl.trim()) {
      // URL 형식 검증
      try {
        // URL이 유효한지 확인 (프로토콜이 없으면 추가)
        const url = newLinkUrl.startsWith("http") ? newLinkUrl : `https://${newLinkUrl}`
        new URL(url)

        setLinks([...links, { url, title: newLinkTitle.trim() || url }])
        setNewLinkUrl("")
        setNewLinkTitle("")
      } catch (error) {
        toast({
          title: "유효하지 않은 URL",
          description: "올바른 URL 형식을 입력해주세요.",
          variant: "destructive",
        })
      }
    }
  }

  // 링크 제거 핸들러
  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  // 태그 추가 핸들러
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  // 태그 제거 핸들러
  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // 입력 검증
    if (!title.trim()) {
      setError("제목을 입력해주세요.")
      return
    }
    if (!content.trim()) {
      setError("내용을 입력해주세요.")
      return
    }

    setIsSubmitting(true)

    try {
      console.log("Updating post with ID:", postId)

      // 게시글 데이터 업데이트
      const postData = {
        title: title.trim(),
        content,
        updatedAt: serverTimestamp(),
        isPinned,
        isNotice,
        files: fileUrls.length > 0 ? fileUrls : [],
        links: links.length > 0 ? links : [],
        tags: tags.length > 0 ? tags : [],
      }

      console.log("Update data:", postData)

      // Firestore에 게시글 업데이트
      const postRef = doc(db, "community_posts", postId)
      await updateDoc(postRef, postData)

      console.log("Post updated successfully")

      toast({
        title: "게시글이 수정되었습니다",
        description: "커뮤니티 게시글이 성공적으로 수정되었습니다.",
        variant: "default",
      })

      // 게시글 상세 페이지로 이동
      router.push(`/community/${postId}`)
    } catch (error) {
      console.error("Error updating community post:", error)
      setError("게시글 수정 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error && !title) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-xl font-bold">{error}</h3>
              <p className="text-muted-foreground mt-2">요청하신 게시글을 찾을 수 없거나 접근할 수 없습니다.</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push("/community")}>
                커뮤니티로 돌아가기
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push(`/community/${postId}`)} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              게시글로 돌아가기
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">게시글 수정</h1>
            <p className="text-muted-foreground mt-2">커뮤니티 게시글을 수정합니다.</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 md:grid-cols-1">
              <Card>
                <CardHeader>
                  <CardTitle>기본 정보</CardTitle>
                  <CardDescription>게시글의 기본 정보를 입력해주세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">제목</Label>
                    <Input
                      id="title"
                      placeholder="게시글 제목"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>게시글 옵션</Label>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isPinned"
                          checked={isPinned}
                          onCheckedChange={(checked) => setIsPinned(checked as boolean)}
                          disabled={isSubmitting}
                        />
                        <Label htmlFor="isPinned">상단 고정</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isNotice"
                          checked={isNotice}
                          onCheckedChange={(checked) => setIsNotice(checked as boolean)}
                          disabled={isSubmitting}
                        />
                        <Label htmlFor="isNotice">공지사항</Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>게시글 내용</CardTitle>
                  <CardDescription>마크다운으로 게시글 내용을 수정해주세요.</CardDescription>
                </CardHeader>
                <CardContent>
                  <MarkdownEditor
                    value={content}
                    onChange={setContent}
                    placeholder="마크다운으로 게시글 내용을 작성하세요..."
                    minHeight="500px"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>첨부 파일</CardTitle>
                  <CardDescription>게시글에 첨부할 파일을 업로드해주세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FileUploader onFilesSelected={handleFileUpload} isUploading={isUploading} />

                  {fileUrls.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium mb-2">첨부된 파일 ({fileUrls.length})</h3>
                      <div className="space-y-2">
                        {fileUrls.map((url, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 text-muted-foreground mr-2" />
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline truncate max-w-[300px]"
                              >
                                {url.split("/").pop() || `파일 ${index + 1}`}
                              </a>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFile(index)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>링크 및 태그</CardTitle>
                  <CardDescription>게시글에 관련 링크와 태그를 추가해주세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 링크 추가 */}
                  <div className="space-y-4">
                    <Label>관련 링크</Label>
                    <div className="flex flex-wrap gap-2 items-end">
                      <div className="space-y-2 flex-1">
                        <Label htmlFor="linkUrl" className="text-xs">
                          URL
                        </Label>
                        <Input
                          id="linkUrl"
                          placeholder="https://example.com"
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2 flex-1">
                        <Label htmlFor="linkTitle" className="text-xs">
                          링크 제목 (선택사항)
                        </Label>
                        <Input
                          id="linkTitle"
                          placeholder="링크 제목"
                          value={newLinkTitle}
                          onChange={(e) => setNewLinkTitle(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleAddLink}
                        className="flex items-center gap-1"
                        disabled={isSubmitting || !newLinkUrl.trim()}
                      >
                        <Plus className="h-4 w-4" />
                        추가
                      </Button>
                    </div>

                    {links.length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-2">
                          {links.map((link, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-sm"
                            >
                              <Link2 className="h-3.5 w-3.5" />
                              <span className="truncate max-w-[200px]">{link.title}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveLink(index)}
                                disabled={isSubmitting}
                                className="h-5 w-5 p-0 ml-1"
                              >
                                <X className="h-3 w-3" />
                                <span className="sr-only">Remove</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 태그 추가 */}
                  <div className="space-y-4">
                    <Label>태그</Label>
                    <div className="flex gap-2 items-end">
                      <div className="space-y-2 flex-1">
                        <Input
                          id="tag"
                          placeholder="태그 입력"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          disabled={isSubmitting}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleAddTag()
                            }
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleAddTag}
                        className="flex items-center gap-1"
                        disabled={isSubmitting || !newTag.trim()}
                      >
                        <Plus className="h-4 w-4" />
                        추가
                      </Button>
                    </div>

                    {tags.length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full text-sm"
                            >
                              <Tag className="h-3.5 w-3.5" />
                              <span>{tag}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveTag(index)}
                                disabled={isSubmitting}
                                className="h-5 w-5 p-0 ml-1"
                              >
                                <X className="h-3 w-3" />
                                <span className="sr-only">Remove</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/community/${postId}`)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "저장하기"
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
