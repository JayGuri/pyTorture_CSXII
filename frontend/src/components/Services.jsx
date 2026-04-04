import React from "react";
import { motion } from "framer-motion";
import {
  Compass,
  GraduationCap,
  FileCheck,
  PlaneTakeoff,
  ShieldCheck,
  HeartHandshake,
} from "lucide-react";

const ServiceStep = ({ title, desc, icon: Icon, index, total }) => {
  return (
    <div className="relative pl-12 lg:pl-24 pb-24 group">
      {/* Timeline Line Connector */}
      {index !== total - 1 && (
        <div className="absolute left-[11px] lg:left-[23px] top-8 bottom-0 w-[1px] bg-brand-obsidian/10 group-hover:bg-brand-gold/30 transition-colors duration-1000" />
      )}

      {/* Timeline Marker */}
      <div className="absolute left-0 top-2 z-10">
        <motion.div 
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          className="w-6 h-6 lg:w-12 lg:h-12 rounded-full bg-brand-ivory border border-brand-obsidian/10 flex items-center justify-center group-hover:border-brand-gold-muted transition-colors duration-700 shadow-sm"
        >
          <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-brand-obsidian group-hover:bg-brand-gold-muted group-hover:scale-125 transition-all duration-700" />
        </motion.div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true }}
        className="flex flex-col lg:flex-row items-start gap-8 lg:gap-32"
      >
        <div className="flex-shrink-0 w-full lg:w-1/3">
          <div className="flex items-center gap-6 mb-4">
             <span className="text-[10px] font-bold tracking-[0.4em] text-brand-gold-muted/40 uppercase">Phase 0{index + 1}</span>
             <Icon className="w-4 h-4 text-brand-gold-muted" />
          </div>
          <h3 className="text-3xl lg:text-5xl font-black text-brand-obsidian tracking-tighter uppercase leading-none">
            {title}
          </h3>
        </div>

        <div className="max-w-2xl">
          <p className="text-lg lg:text-xl text-brand-graphite font-light leading-relaxed group-hover:text-brand-obsidian transition-colors duration-700">
            {desc}
          </p>
          
          <div className="mt-8 flex gap-4 overflow-hidden">
            {["PREMIUM", "EXCLUSIVE", "STRATEGIC"].map((tag, i) => (
              <span key={i} className="text-[8px] font-bold tracking-[0.3em] text-brand-silt border border-brand-obsidian/5 px-3 py-1 rounded-full uppercase">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Services = () => {
  const servicesData = [
    {
      title: "Strategic Consulting",
      desc: "Our senior consultants curate your profile to resonate with elite global committees, ensuring your application is not just seen, but remembered.",
      icon: Compass,
    },
    {
      title: "Academic Selection",
      desc: "We analyze thousands of global programs to find the one that aligns perfectly with your intellectual ambition and career trajectory.",
      icon: GraduationCap,
    },
    {
      title: "Compliance & Visa",
      desc: "Navigate the complexity of international regulations with our specialized legal team, maintaining a 99% success rate across four continents.",
      icon: ShieldCheck,
    },
    {
      title: "Global Transition",
      desc: "From arrival logistics to local networking, we ensure your transition to a new culture is seamless, professional, and sophisticated.",
      icon: PlaneTakeoff,
    },
  ];

  return (
    <section className="bg-brand-ivory py-16 px-8 lg:px-24 overflow-hidden">
      <div className="max-w-[1920px] mx-auto">
        {/* Header Section */}
        <div className="mb-16 flex flex-col lg:flex-row items-start lg:items-end justify-between gap-12">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 mb-8"
            >
              <div className="h-[1px] w-12 bg-brand-gold" />
              <p className="text-[10px] font-bold tracking-[0.5em] text-brand-gold uppercase">
                THE TIMELINE OF SUCCESS
              </p>
            </motion.div>
            <h2 className="text-[10vw] lg:text-8xl font-black text-brand-obsidian leading-[0.8] tracking-tighter uppercase">
              CURATED <br />
              <span className="text-brand-obsidian/40 italic">EXCELLENCE.</span>
            </h2>
          </div>
          <div className="max-w-xs text-right border-r-2 border-brand-gold-muted pr-8 py-4">
            <p className="text-[10px] font-bold tracking-[0.3em] text-brand-obsidian uppercase mb-2">Editorial Directive</p>
            <p className="text-brand-graphite font-medium italic text-right leading-relaxed">
              "We don't follow paths. We engineer them for the world's most ambitious minds."
            </p>
          </div>
        </div>


        {/* Timeline Section */}
        <div className="relative max-w-6xl mx-auto">
          {servicesData.map((service, index) => (
            <ServiceStep 
              key={index} 
              {...service} 
              index={index} 
              total={servicesData.length} 
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;

