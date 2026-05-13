/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Link, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BRAND, Body1, CTA, Greeting, PetSwapEmail, SafetyTip, Title } from '../email-brand.tsx'

interface Props {
  firstName?: string
  endDate?: string
  appUrl?: string
}

const SubscriptionCancelledEmail = ({ firstName, endDate, appUrl }: Props) => {
  const url = appUrl || BRAND.url
  return (
    <PetSwapEmail preview={`Your ${BRAND.name} Premium subscription has been cancelled.`}>
      <Title>We're sorry to see you go 😔</Title>
      <Greeting>{firstName ? `Hi ${firstName},` : 'Hi there,'}</Greeting>
      <Body1>Your {BRAND.name} Premium subscription has been cancelled.</Body1>

      {endDate && (
        <Body1>
          You'll still have full access until <strong>{endDate}</strong>. After that, your account will
          return to the free plan — your profile and pets stay with you.
        </Body1>
      )}

      <CTA href={`${url}/subscription`}>Reactivate your subscription</CTA>

      <SafetyTip>Most members return within 7 days, when they need pet care again.</SafetyTip>

      <Text style={secondary}>
        Anything we could improve? Reply to this email or write to{' '}
        <Link href={`mailto:${BRAND.supportEmail}`} style={link}>{BRAND.supportEmail}</Link> — we read every message.
      </Text>

      <Text style={fineprint}>Cancel anytime · No hidden fees</Text>
      <Text style={legal}>
        <Link href={`${BRAND.url}/legal`} style={legalLink}>Privacy</Link>
        {' · '}
        <Link href={`${BRAND.url}/legal`} style={legalLink}>Terms</Link>
      </Text>
    </PetSwapEmail>
  )
}

export const template = {
  component: SubscriptionCancelledEmail,
  subject: `Your ${BRAND.name} Premium subscription has been cancelled`,
  displayName: 'Subscription cancelled',
  previewData: { firstName: 'Sam', endDate: '3 Jun 2026' },
} satisfies TemplateEntry

const secondary = { fontSize: '14px', color: '#64748B', textAlign: 'center' as const, margin: '12px 0 8px', lineHeight: '1.6' }
const link = { color: '#0B8F6A', textDecoration: 'none', fontWeight: 500 }
const fineprint = { fontSize: '12.5px', color: '#94A3B8', textAlign: 'center' as const, margin: '24px 0 6px' }
const legal = { fontSize: '12px', color: '#CBD5E1', textAlign: 'center' as const, margin: '0' }
const legalLink = { color: '#94A3B8', textDecoration: 'none' }
