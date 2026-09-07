export const SITE_URL = "https://www.nambicrackers.in";

export const buildCanonical = (path: string) =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const defaultImageUrl = `${SITE_URL}/logo.png`;

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Nambi Crackers",
  alternateName: "Nambi Crackers Sivakasi",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: defaultImageUrl,
    width: 512,
    height: 512,
  },
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Nambi Crackers",
  alternateName: "Nambi Crackers Sivakasi",
  url: SITE_URL,
  publisher: {
    "@type": "Organization",
    name: "Nambi Crackers",
    logo: defaultImageUrl,
  },
};

export const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Nambi Crackers",
  image: defaultImageUrl,
  telephone: "+91 63816 55906",
  email: "nambicrackersorder@gmail.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "3/1320/6, Sivakasi to Satur Main Road, Paraipatti",
    addressLocality: "Sivakasi",
    addressRegion: "Tamil Nadu",
    postalCode: "626189",
    addressCountry: "IN",
  },
  areaServed: ["India", "Tamil Nadu", "Sivakasi"],
  brand: {
    "@type": "Brand",
    name: "Nambi Crackers",
    logo: defaultImageUrl,
  },
  sameAs: ["https://www.nambicrackers.in"],
};
