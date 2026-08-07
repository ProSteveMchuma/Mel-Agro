export interface RecoveryInput {
    total: number;
    idleMinutes: number;
    checkoutStep?: string;
    paymentAttempted?: boolean;
    hasPhone: boolean;
    consent: boolean;
    contactCount?: number;
    hoursSinceLastContact?: number | null;
    purchasedAfterCart?: boolean;
}

export interface RecoveryScore {
    score: number;
    priority: 'high' | 'medium' | 'low';
    reasons: string[];
    contactEligible: boolean;
    blockedReason?: string;
}

export function scoreCartRecovery(input: RecoveryInput): RecoveryScore {
    const reasons: string[] = [];
    let score = 0;
    if (input.total >= 10_000) { score += 30; reasons.push('High-value cart'); }
    else if (input.total >= 3_000) { score += 20; reasons.push('Meaningful cart value'); }
    else { score += 10; }
    if (input.checkoutStep === 'review') { score += 25; reasons.push('Reached order review'); }
    else if (input.checkoutStep === 'payment') { score += 20; reasons.push('Reached payment selection'); }
    else if (input.checkoutStep === 'shipping') { score += 10; reasons.push('Entered delivery details'); }
    if (input.paymentAttempted) { score += 20; reasons.push('Attempted payment'); }
    if (input.idleMinutes >= 60 && input.idleMinutes <= 1440) { score += 15; reasons.push('Recently abandoned'); }
    else if (input.idleMinutes > 1440) score += 5;
    if (input.consent) score += 5;

    let blockedReason: string | undefined;
    if (!input.consent) blockedReason = 'Customer has not opted into cart recovery messages';
    else if (!input.hasPhone) blockedReason = 'No phone number available';
    else if (input.purchasedAfterCart) blockedReason = 'Customer completed a purchase after this cart update';
    else if ((input.contactCount || 0) >= 3) blockedReason = 'Maximum recovery contact attempts reached';
    else if (input.hoursSinceLastContact !== null && input.hoursSinceLastContact !== undefined && input.hoursSinceLastContact < 72) blockedReason = `Contact cooldown active for ${Math.ceil(72 - input.hoursSinceLastContact)} more hours`;

    return { score: Math.min(100, score), priority: score >= 65 ? 'high' : score >= 40 ? 'medium' : 'low', reasons, contactEligible: !blockedReason, blockedReason };
}
