/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  BRAND,
  Body1,
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
  chatUrl?: string
  __eventId?: string
  __trackBase?: string
}

const MatchNudge24hEmail = ({ firstName, otherFirstName, chatUrl, __eventId, __trackBase }: Props) => {
  const dest = chatUrl || `${BRAND.url}/messages`
  const url = trackedUrl(dest, 'open_chat', __eventId, __trackBase)
  const them = otherFirstName || 'your match'

  return (
    <PetSwapEmail preview={`Still haven't messaged ${them}? A quick hello goes a long way.`}>
      <Title>Still haven't messaged {them}?</Title>
      <Greeting>{firstName ? `Hi ${firstName},` : 'Hi,'}</Greeting>

      <Body1>
        You matched with <strong style={{ color: '#0F172A' }}>{them}</strong>{' '}
        yesterday — but haven't said hi yet.
      </Body1>

      <Body1>
        A short, friendly intro is usually all it takes to lock in a swap.
      </Body1>

      <CTA href={url}>Send a quick hello</CTA>

      <Text style={hint}>⏱ Most matches that chat within 48h end up swapping</Text>

      <SafetyTip>
        Keep messaging inside {BRAND.name} so we can step in if anything feels off.
      </SafetyTip>
    </PetSwapEmail>
  )
}

export const template = {
  component: MatchNudge24hEmail,
  subject: (d: Record<string, any>) =>
    d?.otherFirstName ? `Still haven't messaged ${d.otherFirstName}?` : `Don't lose your match`,
  displayName: 'Match nudge · 24h',
  previewData: {
    firstName: 'Sam',
    otherFirstName: 'Alex',
    chatUrl: `${BRAND.url}/messages`,
  },
} satisfies TemplateEntry

const hint: React.CSSProperties = {
  margin: '12px 0 0', fontSize: 13, color: '#0B8F6A', textAlign: 'center', fontWeight: 600,
}
