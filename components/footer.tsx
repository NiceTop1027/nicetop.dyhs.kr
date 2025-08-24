import Link from "next/link"
import { Shield, Github, Twitter, Mail, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12 md:px-6 md:py-16 lg:py-20">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary/70 shadow-lg">
                <Shield className="h-5 w-5 text-primary-foreground" />
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-primary to-primary/70 opacity-30 blur-sm"></div>
              </div>
              <span className="text-xl font-bold tracking-tight">NT-SecurityChallenges</span>
            </Link>
            <p className="text-muted-foreground">덕영고등학교 정보보안소프트웨어과에서 만든 보안 도전 플랫폼</p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/nt-security-challenges"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
              >
                <Github className="h-4 w-4" />
                <span className="sr-only">GitHub</span>
              </a>
              <a
                href="https://twitter.com/nt_security"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
              >
                <Twitter className="h-4 w-4" />
                <span className="sr-only">Twitter</span>
              </a>
              <a
                href="mailto:mistarcodm@gmail.com"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
              >
                <Mail className="h-4 w-4" />
                <span className="sr-only">Email</span>
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">카테고리</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/wargame" className="text-muted-foreground transition-colors hover:text-foreground">
                  워게임
                </Link>
              </li>
              <li>
                <Link href="/ctf" className="text-muted-foreground transition-colors hover:text-foreground">
                  CTF
                </Link>
              </li>
              <li>
                <Link href="/community" className="text-muted-foreground transition-colors hover:text-foreground">
                  커뮤니티
                </Link>
              </li>
              <li>
                <Link href="/ranking" className="text-muted-foreground transition-colors hover:text-foreground">
                  랭킹
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">정보</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-muted-foreground transition-colors hover:text-foreground">
                  소개
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-muted-foreground transition-colors hover:text-foreground">
                  자주 묻는 질문
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground transition-colors hover:text-foreground">
                  문의하기
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">
                  개인정보처리방침
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">뉴스레터</h3>
            <p className="mb-4 text-muted-foreground">최신 보안 소식과 도전 과제 업데이트를 받아보세요</p>
            <div className="flex gap-2">
              <Input type="email" placeholder="이메일 주소" className="h-10 rounded-full" />
              <Button size="sm" className="h-10 rounded-full bg-primary">
                구독
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} NT-SecurityChallenges. 덕영고등학교 정보보안소프트웨어과 제작. 모든 권리
            보유.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              이용약관
            </Link>
            <Link href="/privacy" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              개인정보처리방침
            </Link>
            <Link href="/cookies" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              쿠키 정책
            </Link>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Made with</span>
            <Heart className="h-3 w-3 text-red-500" />
            <span>in Korea</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
