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

const MatchNudge72hEmail = ({ firstName, otherFirstName, chatUrl, __eventId, __trackBase }: Props) => {
  const dest = chatUrl || `${BRAND.url}/messages`
  const url = trackedUrl(dest, 'open_chat', __eventId, __trackBase)
  const them = otherFirstName || 'your match'

  return (
    <PetSwapEmail preview={`Last nudge — say hi to ${them} before the match goes cold.`}>
      <Title>Don't let a great match slip away</Title>
      <Greeting>{firstName ? `Hi ${firstName},` : 'Hi,'}</Greeting>

      <Body1>
        It's been a few days since you matched with{' '}
        <strong style={{ color: '#0F172A' }}>{them}</strong>. Matches that go
        quiet rarely turn into swaps.
      </Body1>

      <Body1>
        One short message is enough to bring it back to life.
      </Body1>

      <CTA href={url}>Open chat</CTA>

      <Text style={hint}>
        🛡 {BRAND.name} members are ID-verified and reviewed — you're in safe hands
      </Text>

      <SafetyTip>
        Always meet first and chat inside {BRAND.name} before confirming a swap.
      </SafetyTip>
    </PetSwapEmail>
  )
}

export const template = {
  component: MatchNudge72hEmail,
  subject: (d: Record<string, any>) =>
    d?.otherFirstName ? `Last chance to message ${d.otherFirstName}` : `Your match is going cold`,
  displayName: 'Match nudge · 72h',
  previewData: {
    firstName: 'Sam',
    otherFirstName: 'Alex',
    chatUrl: `${BRAND.url}/messages`,
  },
} satisfies TemplateEntry

const hint: React.CSSProperties = {
  margin: '12px 0 0', fontSize: 13, color: '#475569', textAlign: 'center',
}
