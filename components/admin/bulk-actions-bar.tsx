"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Users, UserCheck, UserX, Ban, Mail, Download, Loader2, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

interface BulkActionsBarProps {
  selectedUsers: string[]
  onClearSelection: () => void
  onRefresh: () => void
}

export function BulkActionsBar({ selectedUsers, onClearSelection, onRefresh }: BulkActionsBarProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    type: string
    title: string
    description: string
    action: () => Promise<void>
  } | null>(null)

  const handleBulkAction = async (type: string, title: string, description: string, action: () => Promise<void>) => {
    setPendingAction({ type, title, description, action })
    setShowConfirmDialog(true)
  }

  const executePendingAction = async () => {
    if (!pendingAction) return

    setIsProcessing(true)
    try {
      await pendingAction.action()
      toast({
        title: "작업 완료",
        description: `${selectedUsers.length}명의 사용자에 대한 작업이 완료되었습니다.`,
      })
      onClearSelection()
      onRefresh()
    } catch (error) {
      console.error("Bulk action error:", error)
      toast({
        title: "작업 실패",
        description: "일괄 작업 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setShowConfirmDialog(false)
      setPendingAction(null)
    }
  }

  const bulkPromoteToAdmin = async () => {
    // 실제 구현에서는 Firebase 업데이트 로직 추가
    console.log("Promoting users to admin:", selectedUsers)
  }

  const bulkDemoteFromAdmin = async () => {
    // 실제 구현에서는 Firebase 업데이트 로직 추가
    console.log("Demoting users from admin:", selectedUsers)
  }

  const bulkSuspendUsers = async () => {
    // 실제 구현에서는 Firebase 업데이트 로직 추가
    console.log("Suspending users:", selectedUsers)
  }

  const bulkSendEmail = async () => {
    // 실제 구현에서는 이메일 발송 로직 추가
    console.log("Sending email to users:", selectedUsers)
  }

  const bulkExportUsers = async () => {
    // 실제 구현에서는 선택된 사용자 데이터 내보내기
    console.log("Exporting users:", selectedUsers)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClearSelection} className="text-gray-600">
          <X className="h-4 w-4 mr-1" />
          선택 해제
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
              일괄 작업
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>권한 관리</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                handleBulkAction(
                  "promote",
                  "관리자 권한 부여",
                  `선택된 ${selectedUsers.length}명의 사용자에게 관리자 권한을 부여하시겠습니까?`,
                  bulkPromoteToAdmin,
                )
              }
            >
              <UserCheck className="mr-2 h-4 w-4" />
              관리자 지정
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                handleBulkAction(
                  "demote",
                  "관리자 권한 해제",
                  `선택된 ${selectedUsers.length}명의 사용자의 관리자 권한을 해제하시겠습니까?`,
                  bulkDemoteFromAdmin,
                )
              }
            >
              <UserX className="mr-2 h-4 w-4" />
              관리자 해제
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>제재 관리</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                handleBulkAction(
                  "suspend",
                  "사용자 일시 정지",
                  `선택된 ${selectedUsers.length}명의 사용자를 일시 정지하시겠습니까?`,
                  bulkSuspendUsers,
                )
              }
              className="text-orange-600"
            >
              <Ban className="mr-2 h-4 w-4" />
              일시 정지
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>커뮤니케이션</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                handleBulkAction(
                  "email",
                  "이메일 발송",
                  `선택된 ${selectedUsers.length}명의 사용자에게 이메일을 발송하시겠습니까?`,
                  bulkSendEmail,
                )
              }
            >
              <Mail className="mr-2 h-4 w-4" />
              이메일 발송
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                handleBulkAction(
                  "export",
                  "데이터 내보내기",
                  `선택된 ${selectedUsers.length}명의 사용자 데이터를 내보내시겠습니까?`,
                  bulkExportUsers,
                )
              }
            >
              <Download className="mr-2 h-4 w-4" />
              데이터 내보내기
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.description}
              <br />
              <span className="text-sm text-red-600 mt-2 block">이 작업은 되돌릴 수 없습니다.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={executePendingAction}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                "확인"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
