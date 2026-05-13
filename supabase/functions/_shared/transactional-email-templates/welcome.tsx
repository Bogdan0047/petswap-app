/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Section, Text, Button as REButton } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BRAND, Body1, CTA, Greeting, PetSwapEmail, Title } from '../email-brand.tsx'

interface Props { firstName?: string }

const WelcomeEmail = ({ firstName }: Props) => {
  const profileUrl = `${BRAND.url}/profile`
  const exploreUrl = `${BRAND.url}/discover`

  return (
    <PetSwapEmail preview={`Welcome to ${BRAND.name} — your next trusted pet care connection awaits.`}>
      <Title>Welcome to {BRAND.name} 🐾</Title>

      <Greeting>{firstName ? `Hi ${firstName},` : 'Hi there,'}</Greeting>

      <Body1>
        You're now part of a trusted community where pet owners help each other —
        no expensive sitters needed.
      </Body1>

      {/* Urgency pill */}
      <Section style={urgencyWrap}>
        <Text style={urgencyPill}>
          ⚡ Profiles completed today get up to 3× more matches
        </Text>
      </Section>

      {/* Quick steps card with icons */}
      <Section style={stepsCard}>
        <Text style={stepsLabel}>GET STARTED IN 3 STEPS</Text>

        <Section style={stepRow}>
          <Text style={stepIcon}>👤</Text>
          <Text style={stepText}>
            <span style={stepStrong}>Complete your profile</span>
          </Text>
        </Section>
        <Section style={stepRow}>
          <Text style={stepIcon}>🐾</Text>
          <Text style={stepText}>
            <span style={stepStrong}>Add your pet</span>
          </Text>
        </Section>
        <Section style={stepRow}>
          <Text style={stepIcon}>💚</Text>
          <Text style={stepText}>
            <span style={stepStrong}>Start matching with nearby members</span>
          </Text>
        </Section>
      </Section>

      <CTA href={profileUrl}>Complete your profile</CTA>

      {/* Secondary CTA */}
      <Section style={secondaryWrap}>
        <REButton href={exploreUrl} style={secondaryBtn}>
          Explore members near you
        </REButton>
      </Section>

      {/* Emotional hook */}
      <Text style={hook}>
        Your next trusted pet care connection could be just one match away.
      </Text>

      {/* Trust pills */}
      <Section style={trustPillWrap}>
        <Text style={trustPill}>
          🌍 Thousands of pet owners are already swapping safely
        </Text>
        <Text style={trustPill}>
          🛡️ Every profile, review, and swap helps build a safer community
        </Text>
      </Section>
    </PetSwapEmail>
  )
}

export const template = {
  component: WelcomeEmail,
  subject: `Welcome to ${BRAND.name} 🐾`,
  displayName: 'Welcome',
  previewData: { firstName: 'Sam' },
} satisfies TemplateEntry

const stepsCard = {
  backgroundColor: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: '14px',
  padding: '18px 20px',
  margin: '8px 0 24px',
}
const stepsLabel = {
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '0.6px',
  color: '#64748B',
  margin: '0 0 12px',
}
const stepRow = {
  display: 'table',
  width: '100%',
  margin: '0 0 12px',
}
const stepIcon = {
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
const stepText = {
  display: 'table-cell',
  fontSize: '14.5px',
  color: '#0F172A',
  paddingLeft: '14px',
  verticalAlign: 'middle' as const,
  lineHeight: '1.5',
  margin: 0,
}
const stepStrong = {
  fontWeight: '600',
  color: '#0F172A',
}
const urgencyWrap = {
  textAlign: 'center' as const,
  margin: '0 0 22px',
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
const secondaryWrap = {
  textAlign: 'center' as const,
  margin: '-12px 0 24px',
}
const secondaryBtn = {
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '600',
  color: '#0B8F6A',
  backgroundColor: '#ffffff',
  border: '1px solid #CFEFE2',
  borderRadius: '999px',
  padding: '11px 22px',
  textDecoration: 'none',
}
const hook = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#0B8F6A',
  textAlign: 'center' as const,
  margin: '8px 0 18px',
  lineHeight: '1.5',
}
const trustPillWrap = {
  textAlign: 'center' as const,
  margin: '0 0 8px',
}
const trustPill = {
  display: 'block',
  fontSize: '12.5px',
  color: '#0F172A',
  backgroundColor: '#F8FAFC',
  border: '1px solid #EEF2F7',
  borderRadius: '999px',
  padding: '9px 16px',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}
