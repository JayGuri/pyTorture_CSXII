import React from "react";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const Counter = ({ value, duration = 2 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const end = parseFloat(value.replace(/[^0-9.]/g, ""));
      const totalMiliseconds = duration * 1000;
      const increment = end / (totalMiliseconds / 16);

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(start);
        }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [isInView, value, duration]);

  const formattedCount =
    value.includes(".") ? count.toFixed(1) : Math.floor(count).toLocaleString();

  return (
    <span ref={ref}>
      {formattedCount}
      {value.includes("+") ? "+" : ""}
    </span>
  );
};

const Stats = () => {
  const stats = [
    {
      label: "Visionaries Sent Abroad",
      value: "45000+",
      sub: "since inception",
    },
    { label: "Elite Core Members", value: "150+", sub: "global experts" },
    { label: "Excellence Rating", value: "4.9", sub: "out of 5.0" },
    {
      label: "University Partners",
      value: "1200+",
      sub: "world-class institutions",
    },
  ];

  return (
    <section className="py-16 bg-brand-ivory border-y border-brand-obsidian/5 relative overflow-hidden">
      <div className="max-w-[1920px] mx-auto px-8 lg:px-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 md:gap-24 lg:gap-32">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="mb-4 overflow-hidden">
                <motion.p className="text-[10px] font-bold tracking-[0.4em] text-brand-gold-muted uppercase opacity-80 group-hover:opacity-100 transition-opacity duration-500">
                  {stat.label}
                </motion.p>
              </div>
              <div className="relative">
                <h2 className="text-5xl md:text-6xl font-black text-brand-obsidian tracking-tighter mb-2 group-hover:text-brand-gold-muted transition-colors duration-700">
                  <Counter value={stat.value} />
                </h2>
                <div className="h-[1px] w-12 bg-brand-gold-muted/30 group-hover:w-full transition-all duration-700 ease-out" />
              </div>
              <p className="mt-4 text-brand-graphite text-xs font-medium uppercase tracking-widest italic group-hover:text-brand-obsidian transition-colors duration-500">
                {stat.sub}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
