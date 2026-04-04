import React from "react";

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="flex flex-col items-start justify-between gap-8 border-t border-white/10 bg-fateh-ink px-6 py-10 text-[0.82rem] text-white/45 md:flex-row md:items-center md:px-10">
      <div className="font-fateh-serif text-xl text-fateh-paper">
        Fateh <span className="text-fateh-gold">Education</span>
      </div>
      <p className="normal-case">
        © {year} Fateh Education. Abroad Education Consultants Since 2004.
      </p>
      <div className="flex flex-wrap gap-6">
        <a
          href="https://www.fateheducation.com/privacy-policy/"
          className="transition hover:text-fateh-gold"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy Policy
        </a>
        <a
          href="https://www.fateheducation.com/privacy-policy/"
          className="transition hover:text-fateh-gold"
          target="_blank"
          rel="noopener noreferrer"
        >
          Terms
        </a>
      </div>
    </footer>
  );
};

export default Footer;
