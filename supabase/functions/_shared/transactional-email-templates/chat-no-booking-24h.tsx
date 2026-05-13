/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  BRAND,
  Body1,
  Bullets,
  Card,
  CardHeading,
  CTA,
  Greeting,
  PetSwapEmail,
  SafetyTip,
  Title,
  trackedUrl,
} from '../email-brand.tsx'

interface Props {
  firstName?: string
  otherFirstName?: string
  bookingUrl?: string
  __eventId?: string
  __trackBase?: string
}

const ChatNoBooking24hEmail = ({
  firstName,
  otherFirstName,
  bookingUrl,
  __eventId,
  __trackBase,
}: Props) => {
  const dest = bookingUrl || `${BRAND.url}/messages`
  const url = trackedUrl(dest, 'confirm_booking', __eventId, __trackBase)
  const them = otherFirstName || 'your match'

  const benefits: React.ReactNode[] = [
    <>Free, trusted pet care — no fees</>,
    <>Verified, reviewed members</>,
    <>Locked-in dates, peace of mind</>,
  ]

  return (
    <PetSwapEmail preview={`Ready to confirm your swap with ${them}?`}>
      <Title>Ready to confirm your pet swap?</Title>
      <Greeting>{firstName ? `Hi ${firstName},` : 'Hi,'}</Greeting>

      <Body1>
        You're already chatting with{' '}
        <strong style={{ color: '#0F172A' }}>{them}</strong> — the hardest part
        is done. Lock in your dates before they fill up.
      </Body1>

      <Card>
        <CardHeading>Why book now</CardHeading>
        <Bullets items={benefits} />
      </Card>

      <CTA href={url}>Confirm your booking</CTA>

      <Text style={urgency}>
        ⏱ Popular members get booked quickly — don't miss the window
      </Text>

      <SafetyTip>
        Confirm dates inside {BRAND.name} so we can step in if anything changes.
      </SafetyTip>

      <Text style={socialProof}>
        Thousands of successful pet swaps happen on {BRAND.name} every week
      </Text>
    </PetSwapEmail>
  )
}

export const template = {
  component: ChatNoBooking24hEmail,
  subject: (d: Record<string, any>) =>
    d?.otherFirstName
      ? `Ready to confirm your swap with ${d.otherFirstName}?`
      : `Ready to confirm your pet swap?`,
  displayName: 'Chat → booking nudge · 24h',
  previewData: {
    firstName: 'Sam',
    otherFirstName: 'Alex',
    bookingUrl: `${BRAND.url}/messages`,
  },
} satisfies TemplateEntry

const urgency: React.CSSProperties = {
  margin: '14px 0 0', fontSize: 13, color: '#0B8F6A', textAlign: 'center', fontWeight: 600,
}
const socialProof: React.CSSProperties = {
  margin: '20px 0 0', fontSize: 12, color: '#94A3B8', textAlign: 'center',
}
