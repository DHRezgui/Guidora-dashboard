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
			description="PAT serveur, sessions courtes et bonnes pratiques pour la production."
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
					<strong>Production —</strong> ne exposez jamais le PAT au navigateur. Conservez-le uniquement
					sur le serveur de votre application (variable d&apos;environnement ou coffre de secrets), puis
					exposez une <strong>session courte</strong> (<code className={INLINE_CODE_CLASS}>td_sess_...</code>
					, ~15 min) via une <strong>route BFF interne</strong> à votre backend. Configurez ensuite{' '}
					<code className={INLINE_CODE_CLASS}>getSdkToken</code> dans le SDK pour récupérer cette session
					côté client.
				</p>
				<p>
					<strong>Développement et tests —</strong> vous pouvez passer le PAT directement dans{' '}
					<code className={INLINE_CODE_CLASS}>sdkToken</code> (variable d&apos;environnement ou
					configuration locale), sans passer par le BFF. Réservez ce mode aux environnements non
					productifs.
				</p>
			</div>
		</PhoenixCollapsibleCard>
	);
}
