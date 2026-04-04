import React from 'react';
import { motion } from 'framer-motion';

const UniversityCard = ({ name, location, rank, index, website }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: index * 0.05 }}
      viewport={{ once: true }}
      className="group relative p-8 border border-brand-obsidian/5 bg-brand-ivory hover:bg-brand-accent transition-all duration-700 overflow-hidden min-h-[320px] flex flex-col justify-between"
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black tracking-[0.4em] text-brand-gold-muted uppercase">QS WORLD RANKING</span>
          <span className="text-4xl font-black text-brand-obsidian/20 tracking-tighter">#{rank}</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold tracking-[0.2em] text-brand-silt uppercase opacity-60">{location}</p>
        </div>
      </div>

      <div className="relative z-10 pt-8">
        <h3 className="text-3xl lg:text-4xl font-black text-brand-obsidian tracking-tighter uppercase leading-[0.9] transition-colors duration-500 max-w-[80%]">
          {name}
        </h3>

        <a href={website} target="_blank" rel="noopener noreferrer" className="mt-16 flex items-center gap-6 group/link cursor-pointer">
          <div className="h-[2px] w-12 bg-brand-gold-muted group-hover/link:w-20 transition-all duration-700" />
          <span className="text-[10px] font-black tracking-[0.4em] text-brand-obsidian uppercase whitespace-nowrap group-hover/link:text-brand-gold-muted transition-colors">Explore Institution</span>
        </a>
      </div>

      {/* Hover Background Accent */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-gold-muted/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
    </motion.div>

  );
};

const Universities = () => {
  const universityData = [
    { name: "University of Oxford", location: "United Kingdom", rank: "1", website: "https://www.ox.ac.uk/" },
    { name: "Harvard University", location: "United States", rank: "2", website: "https://www.harvard.edu/" },
    { name: "Imperial College London", location: "United Kingdom", rank: "3", website: "https://www.imperial.ac.uk/" },
    { name: "ETH Zurich", location: "Switzerland", rank: "4", website: "https://www.ethz.ch/" },
    { name: "University of Cambridge", location: "United Kingdom", rank: "5", website: "https://www.cam.ac.uk/" },
    { name: "Stanford University", location: "United States", rank: "6", website: "https://www.stanford.edu/" },
    { name: "UCL", location: "United Kingdom", rank: "7", website: "https://www.ucl.ac.uk/" },
    { name: "Uni. of Toronto", location: "Canada", rank: "8", website: "https://www.utoronto.ca/" },
    { name: "Melbourne Uni.", location: "Australia", rank: "9", website: "https://www.unimelb.edu.au/" },
  ];

  return (
    <section id="partner-institutions" className="relative py-16 bg-brand-ivory overflow-hidden select-none">
      {/* Background Cinematic Text */}
      <div className="absolute top-0 right-0 pointer-events-none opacity-[0.03]">
        <h2 className="text-[25vw] font-black tracking-[-0.08em] whitespace-nowrap text-brand-obsidian leading-none">
          GLOBAL
        </h2>
      </div>

      <div className="relative z-10 max-w-[1920px] mx-auto px-8 lg:px-24">
        <div className="mb-12 flex flex-col lg:flex-row items-start lg:items-end justify-between gap-12">
          <div className="max-w-2xl">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
              className="flex items-center gap-4 mb-8"
            >
              <div className="h-[1px] w-12 bg-brand-gold" />
              <p className="text-[10px] font-bold tracking-[0.5em] text-brand-gold uppercase">GLOBAL ELITE NETWORK</p>
            </motion.div>
            <h2 className="text-[8vw] lg:text-7xl font-black text-brand-obsidian tracking-tighter uppercase leading-[0.9]">
              THE CIRCLE OF <br />
              <span className="text-brand-obsidian/10 italic">INSTITUTIONS.</span>
            </h2>
          </div>
          <p className="text-[10px] font-bold tracking-[0.4em] text-brand-silt uppercase max-w-[200px] text-right">
            Partnered with the world's most prestigious academic foundations.
          </p>
        </div>

        {/* High-Fidelity Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
          {universityData.map((uni, index) => (
            <UniversityCard key={index} {...uni} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Universities;

