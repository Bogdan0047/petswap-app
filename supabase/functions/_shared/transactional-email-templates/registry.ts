/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as accountDeletionScheduled } from './account-deletion-scheduled.tsx'
import { template as accountVerified } from './account-verified.tsx'
import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as newMatch } from './new-match.tsx'
import { template as reviewRequest } from './review-request.tsx'
import { template as testDelivery } from './test-delivery.tsx'
import { template as welcome } from './welcome.tsx'
import { template as profileIncomplete } from './profile-incomplete.tsx'
import { template as noPetAdded } from './no-pet-added.tsx'
import { template as trustBooster } from './trust-booster.tsx'
import { template as inactiveWinback } from './inactive-winback.tsx'
import { template as reengagement } from './reengagement.tsx'
import { template as matchNudge24h } from './match-nudge-24h.tsx'
import { template as matchNudge72h } from './match-nudge-72h.tsx'
import { template as reviewReminder3d } from './review-reminder-3d.tsx'
import { template as chatNoBooking24h } from './chat-no-booking-24h.tsx'
import { template as subscriptionActive } from './subscription-active.tsx'
import { template as subscriptionConfirmation } from './subscription-confirmation.tsx'
import { template as subscriptionReceipt } from './subscription-receipt.tsx'
import { template as subscriptionWelcome } from './subscription-welcome.tsx'
import { template as subscriptionCancelled } from './subscription-cancelled.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'account-deletion-scheduled': accountDeletionScheduled,
  'account-verified': accountVerified,
  'booking-confirmation': bookingConfirmation,
  'new-match': newMatch,
  'review-request': reviewRequest,
  'test-delivery': testDelivery,
  'welcome': welcome,
  'profile-incomplete': profileIncomplete,
  'no-pet-added': noPetAdded,
  'trust-booster': trustBooster,
  'inactive-winback': inactiveWinback,
  'reengagement': reengagement,
  'match-nudge-24h': matchNudge24h,
  'match-nudge-72h': matchNudge72h,
  'review-reminder-3d': reviewReminder3d,
  'chat-no-booking-24h': chatNoBooking24h,
  'subscription-active': subscriptionActive,
  'subscription-confirmation': subscriptionConfirmation,
  'subscription-receipt': subscriptionReceipt,
  'subscription-welcome': subscriptionWelcome,
  'subscription-cancelled': subscriptionCancelled,
}
