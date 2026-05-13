/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Img, Section, Text } from 'npm:@react-email/components@0.0.22'
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
  otherAvatarUrl?: string
  otherTrustScore?: number | null
  otherLocation?: string
  chatUrl?: string
  __eventId?: string
  __trackBase?: string
  // A/B overrides (injected by send-petswap-email from email_ab_config)
  ctaTextOverride?: string
  urgencyOverride?: string
}

const NewMatchEmail = ({
  firstName,
  otherFirstName,
  otherAvatarUrl,
  otherTrustScore,
  otherLocation,
  chatUrl,
  __eventId,
  __trackBase,
  ctaTextOverride,
  urgencyOverride,
}: Props) => {
  const dest = chatUrl || `${BRAND.url}/messages`
  const url = trackedUrl(dest, 'open_chat', __eventId, __trackBase)
  const them = otherFirstName || 'a nearby pet owner'
  const initial = (otherFirstName || 'P').charAt(0).toUpperCase()
  const trust = typeof otherTrustScore === 'number' ? otherTrustScore : null
  const isTrusted = trust !== null && trust >= 60

  return (
    <PetSwapEmail preview={`You've got a great match with ${them} — don't miss it.`}>
      <Title>You've got a great match — don't miss it 🐾</Title>
      <Greeting>{firstName ? `Hi ${firstName},` : 'Hi,'}</Greeting>

      <Body1>
        You and <strong style={{ color: '#0F172A' }}>{them}</strong> are a
        strong match for pet care. Most successful swaps start within the
        first 24 hours — start the chat now to lock it in.
      </Body1>

      {/* Match card */}
      <Section style={card}>
        <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td width={64} valign="middle" style={{ paddingRight: 16 }}>
                {otherAvatarUrl ? (
                  <Img src={otherAvatarUrl} alt={them} width={56} height={56} style={avatar} />
                ) : (
                  <div style={avatarFallback}>{initial}</div>
                )}
              </td>
              <td valign="middle">
                <Text style={cardName}>{them}</Text>
                {(otherLocation || trust !== null) && (
                  <Text style={trustLine}>
                    {trust !== null && (
                      <>
                        <span style={trustDot}>●</span> Trust score {trust} · active now
                      </>
                    )}
                    {otherLocation && trust !== null && <span> · </span>}
                    {otherLocation && <>📍 {otherLocation}</>}
                  </Text>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Text style={isTrusted ? trustReinforceGood : trustReinforceCaution}>
        {isTrusted
          ? `✔ ${them} is verified and active — strong match potential`
          : `⚠ Review their profile and chat before confirming a swap`}
      </Text>

      <CTA href={url}>{ctaTextOverride || 'Start chat now'}</CTA>

      <Text style={secondaryCta}>
        Or <a href={trackedUrl(`${BRAND.url}/profile`, 'view_profile', __eventId, __trackBase)} style={secondaryLink}>view {them}'s profile</a>
      </Text>

      <Text style={urgencyLine}>
        {urgencyOverride || '⏱ Most successful swaps start within the first 24 hours'}
      </Text>

      <SafetyTip>
        Keep the conversation inside {BRAND.name} — that's how we keep you safe
        and step in if anything goes wrong.
      </SafetyTip>

      <Text style={socialProof}>
        Thousands of successful pet swaps happen on {BRAND.name} every week
      </Text>
    </PetSwapEmail>
  )
}

export const template = {
  component: NewMatchEmail,
  subject: (d: Record<string, any>) =>
    d?.otherFirstName
      ? `You've got a great match with ${d.otherFirstName} — don't miss it 🐾`
      : `You've got a great match on ${BRAND.name} — don't miss it 🐾`,
  displayName: 'New match / connection',
  previewData: {
    firstName: 'Sam',
    otherFirstName: 'Alex',
    otherAvatarUrl: 'https://i.pravatar.cc/120?img=12',
    otherTrustScore: 78,
    otherLocation: 'Hackney, London',
    chatUrl: `${BRAND.url}/messages`,
  },
} satisfies TemplateEntry

const card: React.CSSProperties = {
  background: '#F8FAFC',
  borderRadius: 14,
  padding: '14px 16px',
  margin: '20px 0 8px',
  border: '1px solid #E2E8F0',
}
const avatar: React.CSSProperties = {
  width: 56, height: 56, borderRadius: 28, objectFit: 'cover', display: 'block',
}
const avatarFallback: React.CSSProperties = {
  width: 56, height: 56, borderRadius: 28, background: BRAND.primary,
  color: '#ffffff', fontSize: 22, fontWeight: 700, textAlign: 'center', lineHeight: '56px',
}
const cardName: React.CSSProperties = {
  margin: 0, fontSize: 16, fontWeight: 600, color: '#0F172A', lineHeight: '20px',
}
const trustLine: React.CSSProperties = {
  margin: '4px 0 0', fontSize: 13, color: '#475569', lineHeight: '16px',
}
const trustDot: React.CSSProperties = {
  color: BRAND.primary, marginRight: 4,
}
const trustReinforceGood: React.CSSProperties = {
  margin: '12px 0 4px', fontSize: 13, fontWeight: 600, color: BRAND.primary, lineHeight: '18px',
}
const trustReinforceCaution: React.CSSProperties = {
  margin: '12px 0 4px', fontSize: 13, fontWeight: 600, color: '#B45309', lineHeight: '18px',
}
const urgencyLine: React.CSSProperties = {
  margin: '14px 0 0', fontSize: 13, color: '#0B8F6A', textAlign: 'center', fontWeight: 600,
}
const socialProof: React.CSSProperties = {
  margin: '20px 0 0', fontSize: 12, color: '#94A3B8', textAlign: 'center', letterSpacing: '0.01em',
}
const secondaryCta: React.CSSProperties = {
  margin: '10px 0 0', fontSize: 13, color: '#475569', textAlign: 'center',
}
const secondaryLink: React.CSSProperties = {
  color: '#0B8F6A', textDecoration: 'underline', fontWeight: 600,
}
