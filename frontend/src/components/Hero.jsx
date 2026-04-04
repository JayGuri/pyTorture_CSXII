import React, { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
} from "framer-motion";

const MagneticButton = ({ children, className = "", variant = "primary", onClick, disabledMotion = false }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = (e) => {
    if (disabledMotion) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const distanceX = clientX - centerX;
    const distanceY = clientY - centerY;

    x.set(distanceX * 0.35);
    y.set(distanceY * 0.35);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const variants = {
    primary:
      "bg-brand-gold text-white font-black uppercase tracking-widest hover:bg-brand-obsidian transition-colors duration-500",
    outline:
      "border border-brand-obsidian/10 text-brand-graphite backdrop-blur-md hover:border-brand-gold hover:text-brand-obsidian transition-all duration-500",
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ x: disabledMotion ? 0 : springX, y: disabledMotion ? 0 : springY }}
      className={`relative px-14 py-7 rounded-full text-[10px] sm:text-xs z-10 ${variants[variant]} ${className} group`}
    >
      <span className="relative z-10">{children}</span>
      {variant === "primary" && (
        <motion.div className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
      )}
    </motion.button>
  );
};

const Hero = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 400]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);

  const scrollToId = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      ref={containerRef}
      className="relative h-[120vh] flex flex-col justify-center bg-brand-ivory overflow-hidden lg:px-24 px-8"
    >
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0 select-none">
        <div className="absolute top-1/4 -left-1/4 w-[100vw] h-[100vw] bg-brand-gold/10 blur-[200px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 -right-1/4 w-[80vw] h-[80vw] bg-brand-gold-bright/5 blur-[180px] rounded-full animate-[pulse_8s_infinite]" />
      </div>

      <motion.div
        style={{ y, opacity, scale }}
        className="relative z-10 w-full max-w-[1920px] mx-auto flex flex-col items-start"
      >
        <div className="mb-12 overflow-hidden">
          <motion.p
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-[10px] font-bold tracking-[0.8em] text-brand-gold uppercase"
          >
            FATEH EDUCATION • EST 2004 — LONDON
          </motion.p>
        </div>

        <div className="relative mb-8 max-w-[95vw] lg:max-w-full">
          <motion.h1
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="text-[10vw] md:text-[8.5vw] leading-[0.95] font-black tracking-[-0.05em] uppercase text-brand-obsidian flex flex-col md:flex-row gap-4 mb-4"
          >
            <span className="text-brand-obsidian">YOUR</span> 
            <span className="text-brand-gold italic">LEGACY</span>
          </motion.h1>

          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-8 mt-2 ml-[8vw] lg:ml-[15vw]"
          >
            <h1 className="text-[10vw] md:text-[8.5vw] leading-[0.95] font-black tracking-[-0.05em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#8B1A1E] via-[#D4373B] to-[#FF4545]">
              BEGINS
            </h1>
          </motion.div>

          <motion.h1
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-[10vw] md:text-[8.5vw] leading-[0.95] font-black tracking-[-0.05em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#003153] via-[#0047AB] to-[#2563EB] ml-[4vw] lg:ml-[8vw]"
          >
            WORLDWIDE
          </motion.h1>
        </div>


        <div className="flex flex-col lg:flex-row items-start lg:items-end w-full justify-between gap-6 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="max-w-xl"
          >
            <p className="text-xl md:text-2xl text-brand-graphite font-light leading-[1.3] italic tracking-tight">
              We curate global educational journeys for{" "}
              <span className="text-brand-obsidian font-semibold decoration-brand-gold/40">
                visionaries
              </span>
              . Join 45k+ graduates who transformed ambition into elite careers.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="flex flex-col sm:flex-row gap-6 items-center"
          >
            <MagneticButton 
              variant="primary" 
              onClick={() => scrollToId("lead-form")}
              disabledMotion={true}
            >
              RESERVE YOUR CONSULTATION
            </MagneticButton>
            <MagneticButton 
              variant="outline"
              onClick={() => scrollToId("partner-institutions")}
            >
              VIEW PARTNER INSTITUTIONS
            </MagneticButton>
          </motion.div>
        </div>
      </motion.div>

      {/* Floating Noise/Texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] mix-blend-multiply bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 w-full h-[30vh] bg-gradient-to-t from-brand-ivory to-transparent pointer-events-none z-20" />
    </section>
  );
};

export default Hero;
