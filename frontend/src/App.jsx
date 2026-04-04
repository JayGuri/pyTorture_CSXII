import React, { Suspense, lazy, useEffect } from "react";
import SmoothScroll from "./components/SmoothScroll";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import bg_image1 from "./assets/bg_image1.png";

// Lazy load non-critical sections
const Mission = lazy(() => import("./components/Mission"));
const Achievements = lazy(() => import("./components/Achievements"));
const Universities = lazy(() => import("./components/Universities"));
const Services = lazy(() => import("./components/Services"));
const Leadership = lazy(() => import("./components/Leadership"));
const Testimonials = lazy(() => import("./components/Testimonials"));
const Register = lazy(() => import("./components/Register"));
const Footer = lazy(() => import("./components/Footer"));

// This component ensures Lenis recalculates heights when lazy content loads
const LenisFix = () => {
  useEffect(() => {
    // Small delay to allow React to finish rendering
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  return null;
};

const SectionLoader = () => (
  <div className="flex h-32 w-full items-center justify-center bg-fateh-paper/50">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-fateh-gold/20 border-t-fateh-gold" />
  </div>
);

function App() {
  return (
    <SmoothScroll>
      <div className="relative">
        <Navbar />
        <main>
          <Hero />
          <Suspense fallback={<SectionLoader />}>
            <LenisFix />
            <div className="h-px bg-fateh-border" />
            <Mission />
            <div className="h-px bg-fateh-border" />
            <Achievements />
            <div
              className="bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${bg_image1})` }}
            >
              <Universities />
              <Services />
            </div>
            <Leadership />
            <Testimonials />
            <Register />
            <Footer />
          </Suspense>
        </main>
      </div>
    </SmoothScroll>
  );
}

export default App;
