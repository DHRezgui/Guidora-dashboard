'use client';

import { useState } from 'react';
import { PhoenixCollapsibleCard } from '@/app/dashboard/blueprints/_components/phoenix-collapsible';

const INLINE_CODE_CLASS =
	'rounded-md border border-slate-200/80 bg-slate-100/80 px-1.5 py-0.5 font-mono text-xs text-slate-800 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-100';

export function SdkIntegrationGuidanceCollapsible() {
	const [open, setOpen] = useState(false);

	return (
		<PhoenixCollapsibleCard
			title="Conseils d'intégration"
			description="Expiration obligatoire, PAT serveur et déploiement production (BFF)."
			open={open}
			onOpenChange={setOpen}
		>
			<div className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
				<p>
					Générez un <strong>PAT serveur</strong> (<code className={INLINE_CODE_CLASS}>td_sdk_...</code>)
					avec <strong>expiration obligatoire</strong> (7 à 365 jours). Le secret n&apos;est affiché
					qu&apos;une seule fois à la création.
				</p>
				<p>
					<strong>Production —</strong> ne exposez pas le PAT au navigateur. Stockez-le côté serveur
					dans <code className={INLINE_CODE_CLASS}>TRUSTDEV_SDK_TOKEN</code>, puis exposez une session
					courte via la route BFF{' '}
					<code className={INLINE_CODE_CLASS}>/api/trustdev/sdk-session</code> et{' '}
					<code className={INLINE_CODE_CLASS}>getSdkToken</code> dans la configuration du SDK.
				</p>
				<p>
					<strong>Développement / lab / soutenance —</strong> vous pouvez continuer à utiliser{' '}
					<code className={INLINE_CODE_CLASS}>NEXT_PUBLIC_TRUSTDEV_SDK_TOKEN</code> (PAT direct) sans
					passer par le BFF.
				</p>
			</div>
		</PhoenixCollapsibleCard>
	);
}
