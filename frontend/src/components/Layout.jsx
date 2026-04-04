import React from "react";
import SmoothScroll from "./SmoothScroll";
import Navbar from "./Navbar";
import ScrollToHash from "./ScrollToHash";
import VoiceAgent from "./forYou/VoiceAgent";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children }) {
  const { isAuthenticated } = useAuth();

  return (
    <SmoothScroll>
      <ScrollToHash />
      <div className="relative min-h-screen">
        <Navbar />
        {children}
        {isAuthenticated && <VoiceAgent />}
      </div>
    </SmoothScroll>
  );
}
