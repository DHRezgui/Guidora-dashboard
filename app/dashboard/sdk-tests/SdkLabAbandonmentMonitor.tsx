'use client';

import { useCallback, useMemo } from 'react';
import { AbandonmentRiskBadge } from '@sdk/components/AbandonmentRiskBadge';
import { ProactiveHelpToast } from '@sdk/components/ProactiveHelpToast';
import { useAbandonmentPrediction } from '@sdk/hooks/useAbandonmentPrediction';
import { useFrictionDetection } from '@sdk/hooks/useFrictionDetection';
import { useFrictionScore } from '@sdk/hooks/useFrictionScore';
import { requestProactiveHelp } from '@sdk/utils/proactive-help-bus';
import { normalizeFrictionScore } from '@sdk/utils/friction-scoring';
import { getOrCreateSessionId } from '@sdk/utils/storage';
import { getLabPublishConfig } from './lab-shared';

/** Lab-only monitor for validating LightGBM predictions and proactive help toast. */
export function SdkLabAbandonmentMonitor() {
	const config = useMemo(() => getLabPublishConfig(), []);
	const sessionId = useMemo(() => getOrCreateSessionId(), []);
	const friction = useFrictionDetection({ enabled: true, config, trackRawEvents: true });
	const frictionScore = useFrictionScore(friction.counters);
	const localRisk = useMemo(
		() => normalizeFrictionScore(frictionScore.score),
		[frictionScore.score],
	);
	const handleHighRisk = useCallback(() => {
		requestProactiveHelp({
			message:
				'Signal de friction détecté dans le lab. Validez le toast proactif avant la production.',
			openFaq: false,
		});
	}, []);
	const abandonment = useAbandonmentPrediction({
		enabled: true,
		config,
		counters: friction.counters,
		getSignals: friction.getSignals,
		localScore: frictionScore,
		sessionId,
		pollIntervalMs: 15_000,
		minSignals: 2,
		threshold: 0.35,
		onHighRisk: handleHighRisk,
	});

	return (
		<div className="space-y-3">
			<AbandonmentRiskBadge
				result={abandonment.result}
				isLoading={abandonment.isLoading}
				localRisk={localRisk}
			/>
			<ProactiveHelpToast enabled />
		</div>
	);
}
