/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import {
  BRAND,
  Body1,
  Bullets,
  Card,
  CardHeading,
  CTA,
  Greeting,
  Note,
  PetSwapEmail,
  SafetyTip,
  Title,
  trackedUrl,
} from '../email-brand.tsx'

interface Props {
  firstName?: string
  otherUser?: string
  dates?: string
  petName?: string
  location?: string
  bookingUrl?: string
  /** Days until the swap starts. If omitted, computed from startAt. */
  daysUntilStart?: number
  /** ISO start timestamp — used to compute the countdown when daysUntilStart is missing. */
  startAt?: string
  __eventId?: string
  __trackBase?: string
  // A/B overrides
  ctaTextOverride?: string
  trustOverride?: string
}

const computeDays = (startAt?: string, daysUntilStart?: number): number | null => {
  if (typeof daysUntilStart === 'number') return Math.max(0, Math.round(daysUntilStart))
  if (!startAt) return null
  const ms = Date.parse(startAt)
  if (Number.isNaN(ms)) return null
  const diff = Math.ceil((ms - Date.now()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

const countdownLabel = (days: number) => {
  if (days === 0) return 'Your swap starts today'
  if (days === 1) return 'Your swap starts in 1 day'
  return `Your swap starts in ${days} days`
}

const BookingConfirmationEmail = ({
  firstName,
  otherUser,
  dates,
  petName,
  location,
  bookingUrl,
  daysUntilStart,
  startAt,
  __eventId,
  __trackBase,
  ctaTextOverride,
  trustOverride,
}: Props) => {
  const dest = bookingUrl || `${BRAND.url}/inbox`
  const url = trackedUrl(dest, 'confirm_booking', __eventId, __trackBase)
  const days = computeDays(startAt, daysUntilStart)

  const summaryItems: React.ReactNode[] = []
  if (petName) summaryItems.push(<><strong style={{ color: '#0F172A' }}>Pet:</strong> {petName}</>)
  if (dates) summaryItems.push(<><strong style={{ color: '#0F172A' }}>Dates:</strong> {dates}</>)
  if (otherUser) summaryItems.push(<><strong style={{ color: '#0F172A' }}>With:</strong> {otherUser}</>)
  if (location) summaryItems.push(<><strong style={{ color: '#0F172A' }}>Where:</strong> {location}</>)

  const safetyItems: React.ReactNode[] = [
    <>Agree on routines and feeding</>,
    <>Share emergency contact details</>,
    <>Meet if possible before the swap</>,
  ]

  return (
    <PetSwapEmail
      preview={`Your ${BRAND.name} swap is confirmed${dates ? ` — ${dates}` : ''}.`}
    >
      <Title>
        Booking confirmed{petName ? ` — ${petName} is set` : ''} 🐾
      </Title>

      <Greeting>{firstName ? `Hi ${firstName},` : 'Hi,'}</Greeting>

      <Body1>
        You're all set{otherUser ? <> with <strong style={{ color: '#0F172A' }}>{otherUser}</strong></> : ''}.
        Tap below to review the details and message{otherUser ? ` ${otherUser}` : ' your swap partner'}.
      </Body1>

      {days !== null && (
        <SafetyTip>
          <strong style={{ color: '#0B8F6A' }}>{countdownLabel(days)}</strong>
        </SafetyTip>
      )}

      {summaryItems.length > 0 && (
        <Card>
          <CardHeading>Booking summary</CardHeading>
          <Bullets items={summaryItems} />
        </Card>
      )}

      <Card>
        <CardHeading>Before the swap</CardHeading>
        <Bullets items={safetyItems} />
      </Card>

      <CTA href={url}>{ctaTextOverride || 'View booking'}</CTA>

      <SafetyTip>
        Keep messaging inside {BRAND.name} — that's how we can step in if you
        need help.
      </SafetyTip>

      <Note>{trustOverride || `9 in 10 ${BRAND.name} bookings finish with a 5★ review.`}</Note>
      <Note>✔ Verified members get matched faster — boost your trust score in your profile.</Note>
    </PetSwapEmail>
  )
}

export const template = {
  component: BookingConfirmationEmail,
  subject: (d: Record<string, any>) =>
    d?.petName
      ? `Confirmed: pet care for ${d.petName} 🐾`
      : `Your ${BRAND.name} swap is confirmed 🐾`,
  displayName: 'Booking / swap confirmation',
  previewData: {
    firstName: 'Sam',
    otherUser: 'Alex',
    dates: 'Sat 4 May, 9:00 AM – Sun 5 May, 6:00 PM',
    petName: 'Luna',
    location: 'Hackney, London',
    daysUntilStart: 3,
  },
} satisfies TemplateEntry
