import React from 'react';
import SmoothScroll from './components/SmoothScroll';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Stats from './components/Stats';
import Services from './components/Services';
import Universities from './components/Universities';
import Footer from './components/Footer';

function App() {
  return (
    <SmoothScroll>
      <div className="relative">
        <Navbar />
        <main>
          <Hero />
          <Stats />
          <Services />
          <Universities />
        </main>
        <Footer />
      </div>
    </SmoothScroll>
  );
}

export default App;
