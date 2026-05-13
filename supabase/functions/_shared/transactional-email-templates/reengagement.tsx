/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BRAND, Body1, CTA, Greeting, PetSwapEmail, Title, trackedUrl } from '../email-brand.tsx'

interface Props { firstName?: string; __eventId?: string; __trackBase?: string }

const ReengagementEmail = ({ firstName, __eventId, __trackBase }: Props) => {
  const exploreDest = `${BRAND.url}/discover`
  const exploreUrl = trackedUrl(exploreDest, 'view_profile', __eventId, __trackBase)
  const headline = firstName
    ? `${firstName}, new pet owners just joined near you`
    : 'New pet owners just joined near you'

  return (
    <PetSwapEmail preview={`${firstName ? firstName + ', n' : 'N'}ew pet owners just joined near you on ${BRAND.name}.`}>
      <Title>{headline} 🐾</Title>

      <Greeting>{firstName ? `Hi ${firstName},` : 'Hi there,'}</Greeting>

      <Body1>
        It’s been a few days — there are new members near you ready to swap pet care.
      </Body1>

      <Section style={valueCard}>
        <Text style={valueLabel}>WHAT’S NEW NEAR YOU</Text>
        <Section style={row}>
          <Text style={icon}>📍</Text>
          <Text style={rowText}><span style={strong}>New profiles nearby</span></Text>
        </Section>
        <Section style={row}>
          <Text style={icon}>🛡️</Text>
          <Text style={rowText}><span style={strong}>More trusted members joining</span></Text>
        </Section>
        <Section style={row}>
          <Text style={icon}>✨</Text>
          <Text style={rowText}><span style={strong}>Better matches available</span></Text>
        </Section>
      </Section>

      {/* Soft urgency pill */}
      <Section style={urgencyWrap}>
        <Text style={urgencyPill}>
          ⏳ Don’t miss out on nearby matches
        </Text>
      </Section>

      <CTA href={exploreUrl}>See matches near you</CTA>

      {/* Social proof */}
      <Section style={socialProofWrap}>
        <Text style={socialProofPill}>
          🌍 Thousands of swaps happen every week on {BRAND.name}
        </Text>
      </Section>

      <Text style={nudge}>
        PetSwap works best when you stay active — more activity = more matches.
      </Text>
    </PetSwapEmail>
  )
}

export const template = {
  component: ReengagementEmail,
  subject: ({ firstName }: Props = {}) =>
    firstName
      ? `${firstName}, new pet owners just joined near you 🐾`
      : 'New pet owners just joined near you 🐾',
  displayName: 'Inactive user re-engagement',
  previewData: { firstName: 'Sam' },
} satisfies TemplateEntry

const valueCard = {
  backgroundColor: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: '14px',
  padding: '18px 20px',
  margin: '8px 0 24px',
}
const valueLabel = {
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '0.6px',
  color: '#64748B',
  margin: '0 0 12px',
}
const row = { display: 'table', width: '100%', margin: '0 0 12px' }
const icon = {
  display: 'table-cell',
  width: '36px',
  height: '36px',
  fontSize: '18px',
  backgroundColor: '#F0FAF6',
  border: '1px solid #D1F0E2',
  borderRadius: '999px',
  textAlign: 'center' as const,
  lineHeight: '36px',
  verticalAlign: 'middle' as const,
  margin: 0,
}
const rowText = {
  display: 'table-cell',
  fontSize: '14.5px',
  color: '#0F172A',
  paddingLeft: '14px',
  verticalAlign: 'middle' as const,
  lineHeight: '1.5',
  margin: 0,
}
const strong = { fontWeight: '600', color: '#0F172A' }
const nudge = {
  fontSize: '13.5px',
  color: '#475569',
  textAlign: 'center' as const,
  margin: '8px 0 4px',
  lineHeight: '1.55',
}
const urgencyWrap = {
  textAlign: 'center' as const,
  margin: '0 0 18px',
}
const urgencyPill = {
  display: 'inline-block',
  fontSize: '13px',
  fontWeight: '600',
  color: '#0B8F6A',
  backgroundColor: '#F0FAF6',
  border: '1px solid #CFEFE2',
  borderRadius: '999px',
  padding: '9px 16px',
  margin: 0,
}
const socialProofWrap = {
  textAlign: 'center' as const,
  margin: '4px 0 14px',
}
const socialProofPill = {
  display: 'inline-block',
  fontSize: '12.5px',
  color: '#0F172A',
  backgroundColor: '#F8FAFC',
  border: '1px solid #EEF2F7',
  borderRadius: '999px',
  padding: '9px 16px',
  margin: 0,
}
