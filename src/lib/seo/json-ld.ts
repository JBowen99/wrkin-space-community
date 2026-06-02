import {
	CONTACT_EMAIL,
	DEFAULT_DESCRIPTION,
	ORGANIZATION_NAME,
	ORGANIZATION_SAME_AS,
	SITE_NAME,
	absoluteUrl
} from './site';

export type FaqItem = { question: string; answer: string };

export function organizationJsonLd(origin: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: ORGANIZATION_NAME,
		url: origin,
		email: CONTACT_EMAIL,
		logo: absoluteUrl(origin, '/landing/og.png'),
		...(ORGANIZATION_SAME_AS.length > 0 ? { sameAs: ORGANIZATION_SAME_AS } : {})
	};
}

export function websiteJsonLd(origin: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: SITE_NAME,
		url: origin,
		description: DEFAULT_DESCRIPTION
	};
}

export function softwareApplicationJsonLd(origin: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: SITE_NAME,
		applicationCategory: 'BusinessApplication',
		operatingSystem: 'Web',
		url: origin,
		description: DEFAULT_DESCRIPTION,
		offers: [
			{
				'@type': 'Offer',
				name: 'Personal',
				price: '0',
				priceCurrency: 'USD',
				description: 'Free for small teams — up to 3 members, 1 wrkspace'
			},
			{
				'@type': 'Offer',
				name: 'Plus',
				price: '20',
				priceCurrency: 'USD',
				description: 'Per team per month — up to 5 members, 3 wrkspaces'
			},
			{
				'@type': 'Offer',
				name: 'Pro',
				price: '40',
				priceCurrency: 'USD',
				description: 'Per team per month — up to 10 members, unlimited wrkspaces'
			}
		]
	};
}

export function homePageJsonLd(origin: string) {
	return {
		'@context': 'https://schema.org',
		'@graph': [websiteJsonLd(origin), organizationJsonLd(origin), softwareApplicationJsonLd(origin)]
	};
}

export function faqPageJsonLd(items: FaqItem[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: items.map((item) => ({
			'@type': 'Question',
			name: item.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: item.answer
			}
		}))
	};
}

export function techArticleJsonLd(
	origin: string,
	opts: { title: string; description: string; url: string; dateModified?: string }
) {
	return {
		'@context': 'https://schema.org',
		'@type': 'TechArticle',
		headline: opts.title,
		description: opts.description,
		url: absoluteUrl(origin, opts.url),
		...(opts.dateModified
			? { dateModified: new Date(opts.dateModified).toISOString().slice(0, 10) }
			: {}),
		author: {
			'@type': 'Organization',
			name: ORGANIZATION_NAME,
			url: origin
		},
		publisher: {
			'@type': 'Organization',
			name: ORGANIZATION_NAME,
			logo: {
				'@type': 'ImageObject',
				url: absoluteUrl(origin, '/landing/og.png')
			}
		}
	};
}
