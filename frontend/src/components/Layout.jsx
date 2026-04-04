import React from "react";
import SmoothScroll from "./SmoothScroll";
import Navbar from "./Navbar";
import ScrollToHash from "./ScrollToHash";

export default function Layout({ children }) {
  return (
    <SmoothScroll>
      <ScrollToHash />
      <div className="relative min-h-screen">
        <Navbar />
        {children}
      </div>
    </SmoothScroll>
  );
}
