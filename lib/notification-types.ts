import type { Timestamp } from "firebase/firestore"

export type NotificationType =
  | "announcement"
  | "ctf"
  | "wargame"
  | "community"
  | "verification"
  | "system"
  | "achievement"
  | "level_up"
  | "tier_up"
  | "admin_action"

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  read: boolean
  createdAt: Timestamp
  expiresAt?: Timestamp
  priority?: "low" | "medium" | "high"
  deleted?: boolean
}

export interface NotificationSettings {
  userId: string
  enableAnnouncements: boolean
  enableCtf: boolean
  enableWargame: boolean
  enableCommunity: boolean
  enableVerification: boolean
  enableSystem: boolean
  enableAchievements: boolean
  enableLevelUp: boolean
  enableTierUp: boolean
  enableAdminAction: boolean
  emailNotifications: boolean
  updatedAt: Timestamp
}
