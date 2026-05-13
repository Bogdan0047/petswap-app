/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Link, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BRAND, Body1, CTA, Greeting, PetSwapEmail, SafetyTip, Title } from '../email-brand.tsx'

interface Props {
  firstName?: string
  amount?: string
  paymentDate?: string
  paymentMethod?: string
  manageUrl?: string
  appUrl?: string
}

const SubscriptionReceiptEmail = ({
  firstName,
  amount = '4.99',
  paymentDate,
  paymentMethod = 'Card',
  manageUrl,
  appUrl,
}: Props) => {
  const manage = manageUrl || `${BRAND.url}/subscription`
  const explore = appUrl || `${BRAND.url}/home`
  return (
    <PetSwapEmail preview={`Payment confirmed — welcome to ${BRAND.name} Premium`}>
      <Title>Payment confirmed ✅</Title>
      <Greeting>{firstName ? `Hi ${firstName},` : 'Hi there,'}</Greeting>
      <Body1>
        Your payment was processed securely via Stripe. You now have full access to {BRAND.name} Premium.
      </Body1>

      <Section style={card}>
        <Text style={cardLabel}>RECEIPT</Text>
        <Text style={row}><span style={k}>Amount paid </span><span style={v}>£{amount}</span></Text>
        {paymentDate && (
          <Text style={row}><span style={k}>Date </span><span style={v}>{paymentDate}</span></Text>
        )}
        <Text style={row}><span style={k}>Payment method </span><span style={v}>{paymentMethod}</span></Text>
      </Section>

      <CTA href={explore}>Start exploring {BRAND.name}</CTA>

      <SafetyTip>Members save hundreds on pet sitting every year.</SafetyTip>

      <Text style={secondary}>
        <Link href={manage} style={link}>View or manage your subscription →</Link>
      </Text>

      <Text style={fineprint}>Cancel anytime · No hidden fees · What you see is what you pay.</Text>
      <Text style={legal}>
        <Link href={`${BRAND.url}/legal`} style={legalLink}>Privacy</Link>
        {' · '}
        <Link href={`${BRAND.url}/legal`} style={legalLink}>Terms</Link>
      </Text>
    </PetSwapEmail>
  )
}

export const template = {
  component: SubscriptionReceiptEmail,
  subject: `Payment confirmed – ${BRAND.name} Premium`,
  displayName: 'Subscription receipt',
  previewData: { firstName: 'Sam', amount: '4.99', paymentDate: '3 May 2026', paymentMethod: 'Visa •••• 4242' },
} satisfies TemplateEntry

const card = { backgroundColor: '#F8FAFC', border: '1px solid #EEF2F7', borderRadius: '16px', padding: '20px 22px', margin: '8px 0 24px' }
const cardLabel = { fontSize: '11px', fontWeight: '700', letterSpacing: '0.8px', color: '#94A3B8', margin: '0 0 14px' }
const row = { fontSize: '14.5px', color: '#0F172A', margin: '0 0 8px', lineHeight: '1.5', display: 'flex' as const, justifyContent: 'space-between' as const }
const k = { color: '#64748B' }
const v = { fontWeight: '600', color: '#0F172A' }
const secondary = { fontSize: '14px', textAlign: 'center' as const, margin: '4px 0 20px' }
const link = { color: '#0B8F6A', textDecoration: 'none', fontWeight: 500 }
const fineprint = { fontSize: '12.5px', color: '#94A3B8', textAlign: 'center' as const, margin: '24px 0 6px', letterSpacing: '0.01em' }
const legal = { fontSize: '12px', color: '#CBD5E1', textAlign: 'center' as const, margin: '0' }
const legalLink = { color: '#94A3B8', textDecoration: 'none' }
