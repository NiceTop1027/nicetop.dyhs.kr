"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { parseMarkdown } from "@/lib/markdown-parser"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Reply,
  ThumbsUp,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Loader2,
  AlertCircle,
  LogIn,
  UserPlus,
} from "lucide-react"
import Link from "next/link"
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CommunityPost {
  id: string
  title: string
  content: string
  authorId: string
  authorName: string
  authorAvatar?: string
  category: string
  tags: string[]
  createdAt: any
  updatedAt?: any
  likes: string[]
  bookmarks: string[]
  viewCount: number
  commentCount: number
  isPublished: boolean
}

interface Comment {
  id: string
  postId: string
  content: string
  authorId: string
  authorName: string
  authorAvatar?: string
  createdAt: any
  updatedAt?: any
  likes: string[]
  parentId?: string
  replies?: Comment[]
}

export default function CommunityPostPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  const [post, setPost] = useState<CommunityPost | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin"

  // 댓글 작성 권한 확인 (로그인하지 않았거나 일회용 계정인 경우 false)
  const canComment = user && !userProfile?.isTemporary

  // 게시글 데이터 가져오기
  const fetchPost = async () => {
    try {
      const postRef = doc(db, "community_posts", params.id)
      const postSnap = await getDoc(postRef)

      if (!postSnap.exists()) {
        setError("존재하지 않는 게시글입니다.")
        return
      }

      const postData = postSnap.data()
      if (!postData.isPublished && postData.authorId !== user?.uid && !isAdmin) {
        setError("접근 권한이 없습니다.")
        return
      }

      const postLikes = Array.isArray(postData.likes) ? postData.likes : []
      const postBookmarks = Array.isArray(postData.bookmarks) ? postData.bookmarks : []
      const postTags = Array.isArray(postData.tags) ? postData.tags : []

      setPost({
        id: postSnap.id,
        title: postData.title || "",
        content: postData.content || "",
        authorId: postData.authorId || "",
        authorName: postData.authorName || "",
        authorAvatar: postData.authorAvatar || "",
        category: postData.category || "",
        tags: postTags,
        createdAt: postData.createdAt,
        updatedAt: postData.updatedAt,
        likes: postLikes,
        bookmarks: postBookmarks,
        viewCount: postData.viewCount || 0,
        commentCount: postData.commentCount || 0,
        isPublished: postData.isPublished || false,
      })

      // 조회수 증가 (로그인한 사용자만)
      if (user?.uid && postData.authorId !== user.uid) {
        await updateDoc(postRef, {
          viewCount: increment(1),
        })
      }
    } catch (error: any) {
      console.error("Error fetching post:", error)
      setError("게시글을 불러오는 중 오류가 발생했습니다.")
    }
  }

  // 댓글 데이터 가져오기
  const fetchComments = async () => {
    try {
      const commentsRef = collection(db, "community_comments")
      const q = query(commentsRef, where("postId", "==", params.id), orderBy("createdAt", "desc"))
      const querySnapshot = await getDocs(q)

      const commentsData: Comment[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const commentLikes = Array.isArray(data.likes) ? data.likes : []

        commentsData.push({
          id: doc.id,
          postId: data.postId || "",
          content: data.content || "",
          authorId: data.authorId || "",
          authorName: data.authorName || "",
          authorAvatar: data.authorAvatar || "",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          likes: commentLikes,
          parentId: data.parentId,
        })
      })

      // 댓글과 답글 구조화
      const topLevelComments = commentsData.filter((comment) => !comment.parentId)
      const repliesMap = new Map<string, Comment[]>()

      commentsData
        .filter((comment) => comment.parentId)
        .forEach((reply) => {
          if (!repliesMap.has(reply.parentId!)) {
            repliesMap.set(reply.parentId!, [])
          }
          repliesMap.get(reply.parentId!)!.push(reply)
        })

      topLevelComments.forEach((comment) => {
        comment.replies = repliesMap.get(comment.id) || []
      })

      setComments(topLevelComments)
    } catch (error: any) {
      console.error("Error fetching comments:", error)
      setComments([]) // 에러 시 빈 배열로 설정
    }
  }

  // 좋아요 토글 (로그인한 사용자만)
  const toggleLike = async () => {
    if (!user?.uid || !post) return

    try {
      const postRef = doc(db, "community_posts", post.id)
      const isLiked = post.likes.includes(user.uid)

      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid),
        })
        setPost((prev) =>
          prev
            ? {
                ...prev,
                likes: prev.likes.filter((id) => id !== user.uid),
              }
            : null,
        )
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid),
        })
        setPost((prev) =>
          prev
            ? {
                ...prev,
                likes: [...prev.likes, user.uid],
              }
            : null,
        )
      }
    } catch (error: any) {
      console.error("Error toggling like:", error)
      toast({
        title: "오류",
        description: "좋아요 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 북마크 토글 (로그인한 사용자만)
  const toggleBookmark = async () => {
    if (!user?.uid || !post) return

    try {
      const postRef = doc(db, "community_posts", post.id)
      const isBookmarked = post.bookmarks.includes(user.uid)

      if (isBookmarked) {
        await updateDoc(postRef, {
          bookmarks: arrayRemove(user.uid),
        })
        setPost((prev) =>
          prev
            ? {
                ...prev,
                bookmarks: prev.bookmarks.filter((id) => id !== user.uid),
              }
            : null,
        )
        toast({
          title: "북마크 해제",
          description: "북마크가 해제되었습니다.",
        })
      } else {
        await updateDoc(postRef, {
          bookmarks: arrayUnion(user.uid),
        })
        setPost((prev) =>
          prev
            ? {
                ...prev,
                bookmarks: [...prev.bookmarks, user.uid],
              }
            : null,
        )
        toast({
          title: "북마크 추가",
          description: "북마크에 추가되었습니다.",
        })
      }
    } catch (error: any) {
      console.error("Error toggling bookmark:", error)
      toast({
        title: "오류",
        description: "북마크 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 댓글 작성 (정식 계정만 가능)
  const submitComment = async () => {
    if (!canComment || !newComment.trim()) return

    try {
      setIsSubmitting(true)
      const commentsRef = collection(db, "community_comments")

      await addDoc(commentsRef, {
        postId: params.id,
        content: newComment.trim(),
        authorId: user!.uid,
        authorName: userProfile?.username || user!.displayName || "익명",
        authorAvatar: userProfile?.photoURL || user!.photoURL || "",
        createdAt: serverTimestamp(),
        likes: [],
      })

      // 게시글의 댓글 수 증가
      const postRef = doc(db, "community_posts", params.id)
      await updateDoc(postRef, {
        commentCount: increment(1),
      })

      setNewComment("")
      await fetchComments()

      toast({
        title: "댓글 작성 완료",
        description: "댓글이 성공적으로 작성되었습니다.",
      })
    } catch (error: any) {
      console.error("Error submitting comment:", error)
      toast({
        title: "오류",
        description: "댓글 작성 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 답글 작성 (정식 계정만 가능)
  const submitReply = async (parentId: string) => {
    if (!canComment || !replyContent.trim()) return

    try {
      setIsSubmitting(true)
      const commentsRef = collection(db, "community_comments")

      await addDoc(commentsRef, {
        postId: params.id,
        content: replyContent.trim(),
        authorId: user!.uid,
        authorName: userProfile?.username || user!.displayName || "익명",
        authorAvatar: userProfile?.photoURL || user!.photoURL || "",
        createdAt: serverTimestamp(),
        likes: [],
        parentId: parentId,
      })

      // 게시글의 댓글 수 증가
      const postRef = doc(db, "community_posts", params.id)
      await updateDoc(postRef, {
        commentCount: increment(1),
      })

      setReplyContent("")
      setReplyingTo(null)
      await fetchComments()

      toast({
        title: "답글 작성 완료",
        description: "답글이 성공적으로 작성되었습니다.",
      })
    } catch (error: any) {
      console.error("Error submitting reply:", error)
      toast({
        title: "오류",
        description: "답글 작성 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 댓글 좋아요 토글 (로그인한 사용자만)
  const toggleCommentLike = async (commentId: string) => {
    if (!user?.uid) return

    try {
      const commentRef = doc(db, "community_comments", commentId)
      const commentSnap = await getDoc(commentRef)

      if (!commentSnap.exists()) return

      const commentData = commentSnap.data()
      const commentLikes = Array.isArray(commentData.likes) ? commentData.likes : []
      const isLiked = commentLikes.includes(user.uid)

      if (isLiked) {
        await updateDoc(commentRef, {
          likes: arrayRemove(user.uid),
        })
      } else {
        await updateDoc(commentRef, {
          likes: arrayUnion(user.uid),
        })
      }

      await fetchComments()
    } catch (error: any) {
      console.error("Error toggling comment like:", error)
    }
  }

  // 댓글 삭제
  const deleteComment = async (commentId: string) => {
    if (!user?.uid) return

    try {
      await deleteDoc(doc(db, "community_comments", commentId))

      // 게시글의 댓글 수 감소
      const postRef = doc(db, "community_posts", params.id)
      await updateDoc(postRef, {
        commentCount: increment(-1),
      })

      await fetchComments()
      setShowDeleteDialog(false)
      setDeletingCommentId(null)

      toast({
        title: "댓글 삭제 완료",
        description: "댓글이 삭제되었습니다.",
      })
    } catch (error: any) {
      console.error("Error deleting comment:", error)
      toast({
        title: "오류",
        description: "댓글 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 공유하기
  const sharePost = async () => {
    if (!post) return

    try {
      const url = window.location.href
      await navigator.clipboard.writeText(url)
      toast({
        title: "링크 복사 완료",
        description: "게시글 링크가 클립보드에 복사되었습니다.",
      })
    } catch (error) {
      toast({
        title: "오류",
        description: "링크 복사에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchPost(), fetchComments()])
      setIsLoading(false)
    }

    loadData()

    // 마크다운 코드 복사 기능을 위한 스크립트 추가
    const script = document.createElement("script")
    script.textContent = `
      document.addEventListener('click', function(e) {
        if (e.target.classList.contains('copy-code-btn')) {
          const codeBlock = e.target.nextElementSibling.querySelector('code');
          if (codeBlock) {
            navigator.clipboard.writeText(codeBlock.textContent);
            e.target.textContent = '복사됨!';
            setTimeout(() => {
              e.target.textContent = '복사';
            }, 2000);
          }
        }
      });
    `
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [params.id])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-black">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-400">게시글을 불러오는 중입니다...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen flex-col bg-black">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-red-400 mb-2">{error || "게시글을 찾을 수 없습니다."}</p>
            <Button
              variant="outline"
              onClick={() => router.push("/community")}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              커뮤니티로 돌아가기
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-900 via-black to-blue-900">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 뒤로가기 버튼 */}
          <Button
            variant="ghost"
            onClick={() => router.push("/community")}
            className="mb-6 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            커뮤니티로 돌아가기
          </Button>

          {/* 댓글 작성 제한 안내 */}
          {!canComment && (
            <Alert className="mb-6 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-blue-500/30 backdrop-blur-md">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <span>
                    {!user
                      ? "댓글을 작성하고 게시글에 반응하려면 로그인이 필요합니다."
                      : "일회용 계정으로는 댓글을 작성할 수 없습니다. 정식 계정으로 가입해주세요."}
                  </span>
                  <div className="flex gap-2">
                    {!user ? (
                      <>
                        <Link href="/login">
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                          >
                            <LogIn className="mr-2 h-4 w-4" />
                            로그인
                          </Button>
                        </Link>
                        <Link href="/register">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 bg-transparent"
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            회원가입
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <Link href="/register">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          정식 계정 가입
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 게시글 카드 */}
          <Card className="bg-gray-900/50 border-gray-800 mb-8">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.authorAvatar || "/placeholder.svg"} />
                    <AvatarFallback>{post.authorName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Link href={`/user/${post.authorId}`}>
                      <p className="font-medium text-white hover:text-blue-400 transition-colors">{post.authorName}</p>
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="h-3 w-3" />
                      <span>{post.createdAt?.toDate?.()?.toLocaleDateString() || "날짜 없음"}</span>
                      <Eye className="h-3 w-3 ml-2" />
                      <span>{post.viewCount}회 조회</span>
                    </div>
                  </div>
                </div>

                {(post.authorId === user?.uid || isAdmin) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-gray-800 border-gray-700">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/community/edit/${post.id}`} className="flex items-center">
                          <Edit className="mr-2 h-4 w-4" />
                          수정
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-400">
                        <Trash2 className="mr-2 h-4 w-4" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-900/30 text-blue-300 border-blue-700">
                    {post.category}
                  </Badge>
                  {post.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="bg-gray-800 text-gray-300 border-gray-700">
                      #{tag}
                    </Badge>
                  ))}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{post.title}</h1>
              </div>
            </CardHeader>

            <CardContent>
              <div
                className="prose prose-invert max-w-none mb-6 text-white [&>*]:text-white [&>p]:text-gray-200 [&>h1]:text-white [&>h2]:text-white [&>h3]:text-white [&>h4]:text-white [&>h5]:text-white [&>h6]:text-white [&>li]:text-gray-200 [&>blockquote]:text-gray-300 [&>code]:text-blue-300 [&>pre]:text-gray-100"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(post.content) }}
              />

              {/* 액션 버튼들 */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleLike}
                    disabled={!user}
                    className={`${
                      post.likes.includes(user?.uid || "")
                        ? "text-red-400 hover:text-red-300"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Heart className={`mr-2 h-4 w-4 ${post.likes.includes(user?.uid || "") ? "fill-current" : ""}`} />
                    {post.likes.length}
                  </Button>

                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {post.commentCount}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleBookmark}
                    disabled={!user}
                    className={`${
                      post.bookmarks.includes(user?.uid || "")
                        ? "text-yellow-400 hover:text-yellow-300"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Bookmark
                      className={`mr-2 h-4 w-4 ${post.bookmarks.includes(user?.uid || "") ? "fill-current" : ""}`}
                    />
                    북마크
                  </Button>
                </div>

                <Button variant="ghost" size="sm" onClick={sharePost} className="text-gray-400 hover:text-white">
                  <Share2 className="mr-2 h-4 w-4" />
                  공유
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 댓글 섹션 */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <h2 className="text-xl font-bold text-white">댓글 {comments.length}개</h2>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 댓글 작성 */}
              {canComment ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userProfile?.photoURL || user?.photoURL || ""} />
                      <AvatarFallback>
                        {userProfile?.username?.charAt(0) || user?.displayName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Textarea
                        placeholder="댓글을 작성해주세요..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={submitComment}
                      disabled={!newComment.trim() || isSubmitting}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          작성 중...
                        </>
                      ) : (
                        "댓글 작성"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
                  <AlertCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">
                    {!user ? "댓글을 작성하려면 로그인이 필요합니다." : "일회용 계정으로는 댓글을 작성할 수 없습니다."}
                  </p>
                  <div className="flex justify-center gap-2">
                    {!user ? (
                      <>
                        <Link href="/login">
                          <Button className="bg-blue-600 hover:bg-blue-700">
                            <LogIn className="mr-2 h-4 w-4" />
                            로그인하기
                          </Button>
                        </Link>
                        <Link href="/register">
                          <Button
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            회원가입
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <Link href="/register">
                        <Button className="bg-green-600 hover:bg-green-700">
                          <UserPlus className="mr-2 h-4 w-4" />
                          정식 계정 가입하기
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* 댓글 목록 */}
              <div className="space-y-4">
                {comments && comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="space-y-3">
                      {/* 댓글 */}
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-800/50">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.authorAvatar || "/placeholder.svg"} />
                          <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Link href={`/user/${comment.authorId}`}>
                                <span className="font-medium text-white hover:text-blue-400 transition-colors">
                                  {comment.authorName}
                                </span>
                              </Link>
                              <span className="text-sm text-gray-400">
                                {comment.createdAt?.toDate?.()?.toLocaleDateString() || "날짜 없음"}
                              </span>
                            </div>
                            {(comment.authorId === user?.uid || isAdmin) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-gray-400 hover:text-white"
                                  >
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-gray-800 border-gray-700">
                                  <DropdownMenuItem
                                    className="text-red-400"
                                    onClick={() => {
                                      setDeletingCommentId(comment.id)
                                      setShowDeleteDialog(true)
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    삭제
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          <div
                            className="text-gray-200 text-sm [&>*]:text-gray-200 [&>p]:text-gray-200"
                            dangerouslySetInnerHTML={{ __html: parseMarkdown(comment.content) }}
                          />
                          <div className="flex items-center gap-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCommentLike(comment.id)}
                              disabled={!user}
                              className={`h-6 px-2 ${
                                comment.likes.includes(user?.uid || "")
                                  ? "text-red-400 hover:text-red-300"
                                  : "text-gray-400 hover:text-white"
                              }`}
                            >
                              <ThumbsUp className="mr-1 h-3 w-3" />
                              {comment.likes.length}
                            </Button>
                            {canComment && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                className="h-6 px-2 text-gray-400 hover:text-white"
                              >
                                <Reply className="mr-1 h-3 w-3" />
                                답글
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 답글 작성 */}
                      {replyingTo === comment.id && canComment && (
                        <div className="ml-11 space-y-3">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={userProfile?.photoURL || user?.photoURL || ""} />
                              <AvatarFallback className="text-xs">
                                {userProfile?.username?.charAt(0) || user?.displayName?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <Textarea
                                placeholder="답글을 작성해주세요..."
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 resize-none"
                                rows={2}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setReplyingTo(null)
                                setReplyContent("")
                              }}
                              className="text-gray-400 hover:text-white"
                            >
                              취소
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => submitReply(comment.id)}
                              disabled={!replyContent.trim() || isSubmitting}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  작성 중...
                                </>
                              ) : (
                                "답글 작성"
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* 답글 목록 */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-11 space-y-3">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-700/30">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={reply.authorAvatar || "/placeholder.svg"} />
                                <AvatarFallback className="text-xs">{reply.authorName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Link href={`/user/${reply.authorId}`}>
                                      <span className="text-sm font-medium text-white hover:text-blue-400 transition-colors">
                                        {reply.authorName}
                                      </span>
                                    </Link>
                                    <span className="text-xs text-gray-400">
                                      {reply.createdAt?.toDate?.()?.toLocaleDateString() || "날짜 없음"}
                                    </span>
                                  </div>
                                  {(reply.authorId === user?.uid || isAdmin) && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5 text-gray-400 hover:text-white"
                                        >
                                          <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent className="bg-gray-800 border-gray-700">
                                        <DropdownMenuItem
                                          className="text-red-400"
                                          onClick={() => {
                                            setDeletingCommentId(reply.id)
                                            setShowDeleteDialog(true)
                                          }}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          삭제
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                                <div
                                  className="text-gray-300 text-xs [&>*]:text-gray-300 [&>p]:text-gray-300"
                                  dangerouslySetInnerHTML={{ __html: parseMarkdown(reply.content) }}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleCommentLike(reply.id)}
                                  disabled={!user}
                                  className={`h-5 px-2 ${
                                    reply.likes.includes(user?.uid || "")
                                      ? "text-red-400 hover:text-red-300"
                                      : "text-gray-400 hover:text-white"
                                  }`}
                                >
                                  <ThumbsUp className="mr-1 h-3 w-3" />
                                  {reply.likes.length}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">아직 댓글이 없습니다.</p>
                    <p className="text-gray-500 text-sm">첫 번째 댓글을 작성해보세요!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-800 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">댓글 삭제</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              이 댓글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600">
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCommentId && deleteComment(deletingCommentId)}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
