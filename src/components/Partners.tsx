import Image from "next/image";

const partners = [
  { name: "Bayer", logo: "/assets/partners/bayer.png", url: "https://www.bayer.com" },
  { name: "Syngenta", logo: "/assets/partners/syngenta.png", url: "https://www.syngenta.com" },
  { name: "Corteva Agriscience", logo: "/assets/partners/corteva.png", url: "https://www.corteva.com" },
  { name: "Seed Co", logo: "/assets/partners/seedco.png", url: "https://www.seedcogroup.com" },
  { name: "Unga Group", logo: "/assets/partners/unga.png", url: "https://unga-group.com" },
  { name: "Osho Chemical Industries", logo: "/assets/partners/osho.png", url: "https://oshochem.com" },
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
            width={200}
            height={100}
            sizes="(max-width: 640px) 128px, 176px"
          />
        </a>
      ))}
    </div>
  );
}

export default function Partners() {
  return (
    <section
      className="partners-section py-16 bg-gray-50 relative overflow-hidden rounded-[3rem] mx-4 md:mx-8 my-8 border border-gray-100 shadow-sm"
      aria-labelledby="partners-heading"
    >
      <div className="container-custom mb-10 flex flex-col items-center relative z-10 text-center">
        <span className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-melagri-primary">
          Quality you can trust
        </span>
        <h2 id="partners-heading" className="text-3xl font-black text-gray-900 tracking-tighter mb-2">
          Our Partners
        </h2>
        <p className="text-gray-500 font-medium">Trusted agricultural brands available through Mel-Agri</p>
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
