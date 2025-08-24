"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link,
  Image,
  Code,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { FileUploader } from "@/components/file-uploader"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
  maxHeight?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "내용을 입력하세요...",
  minHeight = "200px",
  maxHeight = "500px",
}: RichTextEditorProps) {
  const [activeTab, setActiveTab] = useState<string>("write")
  const [htmlValue, setHtmlValue] = useState<string>(value)
  const [linkUrl, setLinkUrl] = useState<string>("")
  const [linkText, setLinkText] = useState<string>("")
  const [showLinkDialog, setShowLinkDialog] = useState<boolean>(false)
  const [showImageDialog, setShowImageDialog] = useState<boolean>(false)

  useEffect(() => {
    setHtmlValue(value)
  }, [value])

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHtmlValue(e.target.value)
    onChange(e.target.value)
  }

  const applyFormat = (format: string) => {
    let formattedText = ""
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)

    switch (format) {
      case "bold":
        formattedText = `<strong>${selectedText}</strong>`
        break
      case "italic":
        formattedText = `<em>${selectedText}</em>`
        break
      case "underline":
        formattedText = `<u>${selectedText}</u>`
        break
      case "alignLeft":
        formattedText = `<div style="text-align: left">${selectedText}</div>`
        break
      case "alignCenter":
        formattedText = `<div style="text-align: center">${selectedText}</div>`
        break
      case "alignRight":
        formattedText = `<div style="text-align: right">${selectedText}</div>`
        break
      case "bulletList":
        formattedText = `<ul>\n${selectedText
          .split("\n")
          .map((item) => `  <li>${item}</li>`)
          .join("\n")}\n</ul>`
        break
      case "numberedList":
        formattedText = `<ol>\n${selectedText
          .split("\n")
          .map((item) => `  <li>${item}</li>`)
          .join("\n")}\n</ol>`
        break
      case "code":
        formattedText = `<pre><code>${selectedText}</code></pre>`
        break
      default:
        formattedText = selectedText
    }

    const newValue = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end)
    setHtmlValue(newValue)
    onChange(newValue)
  }

  const insertLink = () => {
    if (!linkUrl) return

    const linkHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText || linkUrl}</a>`
    setHtmlValue(htmlValue + linkHtml)
    onChange(htmlValue + linkHtml)
    setLinkUrl("")
    setLinkText("")
    setShowLinkDialog(false)
  }

  const insertImage = (url: string) => {
    const imageHtml = `<img src="${url}" alt="Uploaded image" style="max-width: 100%; height: auto;" />`
    setHtmlValue(htmlValue + imageHtml)
    onChange(htmlValue + imageHtml)
    setShowImageDialog(false)
  }

  return (
    <div className="border rounded-md">
      <Tabs defaultValue="write" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <TabsList className="grid w-[200px] grid-cols-2">
            <TabsTrigger value="write">작성</TabsTrigger>
            <TabsTrigger value="preview">미리보기</TabsTrigger>
          </TabsList>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" onClick={() => applyFormat("bold")}>
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => applyFormat("italic")}>
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => applyFormat("underline")}>
              <Underline className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => applyFormat("alignLeft")}>
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => applyFormat("alignCenter")}>
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => applyFormat("alignRight")}>
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => applyFormat("bulletList")}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => applyFormat("numberedList")}>
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Link className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>링크 추가</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="link-url" className="text-right">
                      URL
                    </Label>
                    <Input
                      id="link-url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="link-text" className="text-right">
                      텍스트
                    </Label>
                    <Input
                      id="link-text"
                      value={linkText}
                      onChange={(e) => setLinkText(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={insertLink}>추가</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Image className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>이미지 추가</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <FileUploader
                    onUploadComplete={insertImage}
                    acceptedFileTypes={["image/*"]}
                    maxFileSizeMB={5}
                    uploadPath="editor-images"
                  />
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" onClick={() => applyFormat("code")}>
              <Code className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <TabsContent value="write" className="p-0">
          <Textarea
            value={htmlValue}
            onChange={handleHtmlChange}
            placeholder={placeholder}
            className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 whitespace-pre-wrap"
            style={{ minHeight, maxHeight }}
          />
        </TabsContent>
        <TabsContent value="preview" className="p-4">
          {htmlValue ? (
            <div className="prose max-w-none whitespace-pre-line" dangerouslySetInnerHTML={{ __html: htmlValue }} />
          ) : (
            <p className="text-muted-foreground">{placeholder}</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
