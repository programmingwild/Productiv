import { prisma } from "./prisma"

export function getVapidKeys() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? "mailto:contact@productsaas.app"
  if (!publicKey || !privateKey) return null
  return { publicKey, privateKey, subject }
}

export async function sendPushNotification(userId: string, title: string, message: string, link?: string, icon?: string) {
  const webpush = await import("web-push")
  const vapid = getVapidKeys()
  if (!vapid) return

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  })

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({ title, message, link: link ?? "/", icon: icon ?? "/icon.svg" }),
      )
    } catch (err: unknown) {
      if (err instanceof Error && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } })
      }
    }
  }
}

export async function sendPushNotificationToTeam(teamId: string, title: string, message: string, link?: string, excludeUserId?: string) {
  const members = await prisma.teamMember.findMany({
    where: { teamId },
    select: { userId: true },
  })

  for (const member of members) {
    if (member.userId === excludeUserId) continue
    await sendPushNotification(member.userId, title, message, link)
  }
}
