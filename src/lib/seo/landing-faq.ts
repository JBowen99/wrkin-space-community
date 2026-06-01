import type { FaqItem } from './json-ld';

export const LANDING_FAQ: FaqItem[] = [
	{
		question: 'What is a wrkspace?',
		answer:
			'A wrkspace is a project space inside your team. Each wrkspace can enable its own modules — tasks, docs, chat, forum, cards, or calendar — so you only use the tools that project needs.'
	},
	{
		question: 'How do modules work?',
		answer:
			'Modules are optional capabilities you turn on per wrkspace. A product team might use tasks and docs; an ops group might use cards and calendar. You are not forced to navigate features your project will never use.'
	},
	{
		question: 'Can I self-host wrkin.space?',
		answer:
			'Yes. Deploy on your own infrastructure with Docker Compose on a VPS, homelab, or private cloud. See the self-hosting documentation for local development and production deployment guides.'
	},
	{
		question: 'What is included in the free Personal plan?',
		answer:
			'Personal is free per team and includes up to 3 members, 1 wrkspace, up to 3 modules per wrkspace, and 5 MB file uploads. No credit card is required to start.'
	},
	{
		question: 'How does billing work for paid plans?',
		answer:
			'Plus and Pro are priced per team per month ($20 and $40 respectively). Each plan includes members up to its tier limit. Additional members above the cap are billed from $6 per month each.'
	},
	{
		question: 'Is wrkin.space a replacement for Slack?',
		answer:
			'No. wrkin.space is a modular project workspace with async-first forums, focused chat when you need it, and structured task and doc tools — not a chat-first “everything app.”'
	}
];

export const HOW_IT_WORKS_STEPS = [
	{
		title: 'Create a team',
		description:
			'Sign up and invite your teammates. Billing and membership are managed at the team level — one subscription covers everyone on the plan.'
	},
	{
		title: 'Add a wrkspace',
		description:
			'Each wrkspace is a project or area of work. Spin up as many as your plan allows and keep unrelated work separated.'
	},
	{
		title: 'Enable modules',
		description:
			'Turn on tasks, docs, chat, forum, cards, or calendar only where they matter. Your wrkspace stays calm because unused tools stay out of the way.'
	}
] as const;
