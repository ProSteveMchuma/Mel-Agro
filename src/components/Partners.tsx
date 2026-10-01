import Image from "next/image";

// Catalogue brands with an official wordmark. Order follows live product counts.
const partners = [
  { name: "Osho Chemical Industries", logo: "/assets/partners/osho.png", url: "https://oshochem.com", width: 630, height: 404 },
  { name: "Amiran Kenya", logo: "/assets/partners/amiran.png", url: "https://baltoncp.com/amirankenya/", width: 678, height: 652 },
  { name: "Norbrook", logo: "/assets/partners/norbrook.png", url: "https://www.norbrook.com", width: 1100, height: 191 },
  { name: "Simlaw Seeds", logo: "/assets/partners/simlaw.png", url: "https://www.simlaw.co.ke", width: 211, height: 52 },
  { name: "Bayer", logo: "/assets/partners/bayer.png", url: "https://www.bayer.com", width: 1100, height: 389 },
  { name: "Syngenta", logo: "/assets/partners/syngenta.png", url: "https://www.syngenta.com", width: 1100, height: 330 },
  { name: "Corteva Agriscience", logo: "/assets/partners/corteva.png", url: "https://www.corteva.com", width: 424, height: 104 },
  { name: "Seed Co", logo: "/assets/partners/seedco.png", url: "https://www.seedcogroup.com", width: 354, height: 342 },
  { name: "Unga Group", logo: "/assets/partners/unga.png", url: "https://unga-group.com", width: 1009, height: 439 },
] as const;

function PartnerGroup({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <div className="partners-slide" aria-hidden={duplicate || undefined}>
      {partners.map((partner) => (
        <a
          key={partner.name}
          href={partner.url}
          target="_blank"
          rel="noopener noreferrer"
          className="partner-logo"
          tabIndex={duplicate ? -1 : undefined}
          aria-label={duplicate ? undefined : `Visit ${partner.name}`}
        >
          <Image
            src={partner.logo}
            alt={duplicate ? "" : `${partner.name} logo`}
            width={partner.width}
            height={partner.height}
            sizes="(max-width: 640px) 128px, 176px"
            unoptimized
          />
        </a>
      ))}
    </div>
  );
}

export default function Partners({
  eyebrow = 'Quality you can trust',
  title = 'Our Partners',
  subtitle = 'Trusted agricultural brands available through Mel-Agri',
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
} = {}) {
  return (
    <section
      className="partners-section py-16 bg-gray-50 relative overflow-hidden rounded-[3rem] mx-4 md:mx-8 my-8 border border-gray-100 shadow-sm"
      aria-labelledby="partners-heading"
    >
      <div className="container-custom mb-10 flex flex-col items-center relative z-10 text-center">
        {eyebrow ? (
          <span className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-melagri-primary">
            {eyebrow}
          </span>
        ) : null}
        <h2 id="partners-heading" className="text-3xl font-black text-gray-900 tracking-tighter mb-2">
          {title}
        </h2>
        {subtitle ? <p className="text-gray-500 font-medium">{subtitle}</p> : null}
      </div>

      <div className="partners-marquee" aria-label="Partner logos">
        <div className="partners-track">
          <PartnerGroup />
          <PartnerGroup duplicate />
        </div>
      </div>
    </section>
  );
}
