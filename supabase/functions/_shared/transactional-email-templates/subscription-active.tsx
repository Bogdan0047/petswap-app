/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Link, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BRAND, Body1, CTA, Greeting, PetSwapEmail, SafetyTip, Title } from '../email-brand.tsx'

interface Props {
  firstName?: string
  planLabel?: string
  amountLabel?: string
  startDate?: string
  nextBillingDate?: string
  manageUrl?: string
  appUrl?: string
}

const SubscriptionActiveEmail = ({
  firstName,
  planLabel = 'PetSwap Premium',
  amountLabel = '£4.99/month',
  startDate,
  nextBillingDate,
  manageUrl,
  appUrl,
}: Props) => {
  const manage = manageUrl || `${BRAND.url}/subscription`
  const explore = appUrl || `${BRAND.url}/home`
  return (
    <PetSwapEmail preview={`Your ${BRAND.name} Premium subscription is active.`}>
      <Title>Your subscription is active</Title>
      <Greeting>{firstName ? `Hi ${firstName},` : 'Hi there,'}</Greeting>
      <Body1>
        Welcome to {BRAND.name} Premium. Your account is now upgraded and ready to use.
      </Body1>

      <Section style={card}>
        <Text style={cardLabel}>YOU NOW HAVE ACCESS TO</Text>
        <Text style={bullet}><span style={check}>✔</span> Unlimited pet swaps</Text>
        <Text style={bullet}><span style={check}>✔</span> Priority matching</Text>
        <Text style={bullet}><span style={check}>✔</span> Trusted community access</Text>
      </Section>

      <Section style={detailsCard}>
        <Text style={row}><span style={k}>Plan </span><span style={v}>{planLabel}</span></Text>
        <Text style={row}><span style={k}>Amount </span><span style={v}>{amountLabel}</span></Text>
        {startDate && (
          <Text style={row}><span style={k}>Start </span><span style={v}>{startDate}</span></Text>
        )}
        {nextBillingDate && (
          <Text style={row}><span style={k}>Next billing </span><span style={v}>{nextBillingDate}</span></Text>
        )}
      </Section>

      <CTA href={explore}>Find your first swap</CTA>

      <SafetyTip>Your next stress-free holiday starts here.</SafetyTip>

      <Text style={secondary}>
        <Link href={manage} style={link}>Manage your subscription →</Link>
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
  component: SubscriptionActiveEmail,
  subject: `Your ${BRAND.name} Premium subscription is active`,
  displayName: 'Subscription active',
  previewData: {
    firstName: 'Sam',
    planLabel: 'PetSwap Premium',
    amountLabel: '£4.99/month',
    startDate: '3 May 2026',
    nextBillingDate: '3 Jun 2026',
  },
} satisfies TemplateEntry

const card = { backgroundColor: '#F8FAFC', border: '1px solid #EEF2F7', borderRadius: '16px', padding: '20px 22px', margin: '8px 0 16px' }
const detailsCard = { backgroundColor: '#ffffff', border: '1px solid #EEF2F7', borderRadius: '16px', padding: '18px 22px', margin: '0 0 24px' }
const cardLabel = { fontSize: '11px', fontWeight: '700', letterSpacing: '0.8px', color: '#94A3B8', margin: '0 0 12px' }
const bullet = { fontSize: '15px', color: '#0F172A', margin: '0 0 8px', lineHeight: '1.5' }
const check = { color: '#0B8F6A', fontWeight: 700, marginRight: '10px' }
const row = { fontSize: '14px', color: '#0F172A', margin: '0 0 6px', lineHeight: '1.5', display: 'flex' as const, justifyContent: 'space-between' as const }
const k = { color: '#64748B' }
const v = { fontWeight: '600', color: '#0F172A' }
const secondary = { fontSize: '14px', textAlign: 'center' as const, margin: '4px 0 20px' }
const link = { color: '#0B8F6A', textDecoration: 'none', fontWeight: 500 }
const fineprint = { fontSize: '12.5px', color: '#94A3B8', textAlign: 'center' as const, margin: '24px 0 6px' }
const legal = { fontSize: '12px', color: '#CBD5E1', textAlign: 'center' as const, margin: '0' }
const legalLink = { color: '#94A3B8', textDecoration: 'none' }
