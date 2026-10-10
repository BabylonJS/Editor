export interface IJsonLdProps {
	data: Record<string, unknown>;
}

/**
 * Renders the given structured data (https://schema.org) so search engines can read it.
 */
export function JsonLd(props: IJsonLdProps) {
	return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(props.data).replace(/</g, "\\u003c") }} />;
}
