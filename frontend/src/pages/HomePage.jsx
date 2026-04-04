import React from "react";
import Hero from "../components/Hero";
import Mission from "../components/Mission";
import Achievements from "../components/Achievements";
import Universities from "../components/Universities";
import Services from "../components/Services";
import Leadership from "../components/Leadership";
import Testimonials from "../components/Testimonials";
import Register from "../components/Register";
import Footer from "../components/Footer";

export default function HomePage() {
  return (
    <>
      <main>
        <Hero />
        <div className="h-px bg-fateh-border" />
        <Mission />
        <div className="h-px bg-fateh-border" />
        <Achievements />
        <Universities />
        <Services />
        <Leadership />
        <Testimonials />
        <Register />
      </main>
      <Footer />
    </>
  );
}
