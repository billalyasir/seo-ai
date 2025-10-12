// components/Footer.jsx
import React from "react";
import Link from "next/link";
import Image from "next/image";

const YEAR = new Date().getFullYear();

const COMPANY = {
  legalName: "Powersoft Computer Solutions Ltd",
  addressLines: [
    "Powersoft Tower",
    "Leoforos Larnakos 39-41",
    "1046 Nicosia, Cyprus",
  ],
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=Leoforos+Larnakos+39-41,+1046+Nicosia,+Cyprus",
  privacyUrl: "https://powersoft365.com/privacy-policy/", // update if your route differs
  termsUrl: "https://powersoft365.com/terms-and-conditions/", // update if your route differs
};

function AddressBlock() {
  return (
    <address className="not-italic text-sm leading-relaxed text-neutral-300">
      <div className="font-semibold text-neutral-100">{COMPANY.legalName}</div>
      {COMPANY.addressLines.map((line) => (
        <div key={line}>{line}</div>
      ))}
      <div className="mt-2">
        <a
          href={COMPANY.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-md border border-white/15 bg-white/0 px-3 py-1.5 text-xs font-medium text-neutral-100 hover:bg-white/10 transition"
          aria-label="View location on Google Maps"
        >
          View Map
        </a>
      </div>
    </address>
  );
}

const Footer = () => {
  return (
    <footer className="bg-neutral-950 text-neutral-200">
      {/* Top */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-10 sm:gap-12 md:grid-cols-3">
          {/* Brand / blurb */}
          <div>
            <div className="text-2xl font-bold tracking-tight text-white">
              <Image
                src="/powersoft-logo.png"
                width={200}
                height={200}
                className="object-contain"
                alt="powersoft365"
              />
            </div>
            <p className="mt-3 text-sm text-neutral-400 max-w-prose">
              Business-grade software & services trusted by leading
              organizations. Built for reliability, security, and scale.
            </p>
          </div>

          {/* Location */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Location
            </h3>
            <div className="mt-4">
              <AddressBlock />
            </div>
          </div>

          {/* Policies */}
          <nav aria-label="Policies">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Policies
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link
                  target="_blank"
                  href={COMPANY.privacyUrl}
                  className="text-neutral-300 hover:text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  target="_blank"
                  href={COMPANY.termsUrl}
                  className="text-neutral-300 hover:text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition"
                >
                  Terms &amp; Conditions
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Bottom bar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col gap-2 text-xs text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {YEAR} {COMPANY.legalName}. All rights reserved.
          </p>
          <p className="text-neutral-500">
            Responsive • Accessible • Production-ready
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
